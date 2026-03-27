/**
 * Firebase gateway for NaMo Care.
 *
 * Provides anonymous auth + full Firestore REST CRUD with localStorage fallback.
 * When VITE_FIREBASE_* env vars are absent, all writes/reads degrade gracefully to
 * console.log / empty arrays so local development never breaks.
 */

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

const REQUIRED_KEYS = ['apiKey', 'projectId'];

export function isFirebaseConfigured() {
  return REQUIRED_KEYS.every((k) => firebaseConfig[k]);
}

const FS_BASE = () =>
  `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`;

// ─── Firestore value serialization ──────────────────────────────────────────

function toFsValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) {
    if (!v.length) return { arrayValue: {} };
    return { arrayValue: { values: v.map(toFsValue) } };
  }
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') {
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  }
  if (typeof v === 'object') return { mapValue: { fields: toFsFields(v) } };
  return { stringValue: String(v) };
}

function toFsFields(obj) {
  const f = {};
  Object.entries(obj).forEach(([k, v]) => { if (v !== undefined) f[k] = toFsValue(v); });
  return f;
}

function fromFsValue(fv) {
  if (!fv) return null;
  if ('nullValue' in fv) return null;
  if ('stringValue' in fv) return fv.stringValue;
  if ('booleanValue' in fv) return fv.booleanValue;
  if ('integerValue' in fv) return Number(fv.integerValue);
  if ('doubleValue' in fv) return fv.doubleValue;
  if ('timestampValue' in fv) return fv.timestampValue;
  if ('arrayValue' in fv) return (fv.arrayValue?.values || []).map(fromFsValue);
  if ('mapValue' in fv) return fromFsFields(fv.mapValue?.fields || {});
  return null;
}

function fromFsFields(fields) {
  const obj = {};
  Object.entries(fields).forEach(([k, fv]) => { obj[k] = fromFsValue(fv); });
  return obj;
}

function docToObj(doc) {
  if (!doc?.fields) return null;
  return { id: doc.name?.split('/').pop() || null, ...fromFsFields(doc.fields) };
}

// ─── Anonymous Auth ──────────────────────────────────────────────────────────

const AUTH_KEY = 'namo_fb_auth';

function loadAuth() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (d.expiresAt && Date.now() > d.expiresAt - 300_000) return null; // refresh 5 min early
    return d;
  } catch { return null; }
}

function storeAuth(d) {
  try {
    localStorage.setItem(AUTH_KEY, JSON.stringify({
      ...d,
      expiresAt: Date.now() + Number(d.expiresIn || 3600) * 1000,
    }));
  } catch { /* storage quota exceeded — ignore */ }
}

async function doAnonSignIn() {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ returnSecureToken: true }) },
  );
  if (!res.ok) throw new Error('Anonymous sign-in failed');
  const d = await res.json();
  storeAuth(d);
  return d;
}

async function doRefreshToken(refreshToken) {
  const res = await fetch(
    `https://securetoken.googleapis.com/v1/token?key=${firebaseConfig.apiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grant_type: 'refresh_token', refresh_token: refreshToken }) },
  );
  if (!res.ok) throw new Error('Token refresh failed');
  const d = await res.json();
  const norm = { idToken: d.id_token, localId: d.user_id, refreshToken: d.refresh_token, expiresIn: d.expires_in };
  storeAuth(norm);
  return norm;
}

async function getIdToken() {
  const stored = loadAuth();
  if (stored?.idToken) return stored.idToken;
  if (stored?.refreshToken) {
    try { return (await doRefreshToken(stored.refreshToken)).idToken; } catch { /* fall through to sign-in */ }
  }
  return (await doAnonSignIn()).idToken;
}

export async function getCurrentUserId() {
  if (!isFirebaseConfigured()) return 'local_user';
  const stored = loadAuth();
  if (stored?.localId) return stored.localId;
  try {
    const d = await doAnonSignIn();
    return d.localId;
  } catch { return 'local_user'; }
}

// ─── REST helpers ────────────────────────────────────────────────────────────

async function authHeaders() {
  const h = { 'Content-Type': 'application/json' };
  if (isFirebaseConfigured()) {
    try { h['Authorization'] = `Bearer ${await getIdToken()}`; } catch { /* use unauthenticated */ }
  }
  return h;
}

async function getDocument(path, id) {
  const url = `${FS_BASE()}/${path}/${id}?key=${firebaseConfig.apiKey}`;
  const res = await fetch(url, { headers: await authHeaders() });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Firestore GET failed (${res.status})`);
  return docToObj(await res.json());
}

async function setDocument(path, id, data) {
  const url = `${FS_BASE()}/${path}/${id}?key=${firebaseConfig.apiKey}`;
  const res = await fetch(url, {
    method: 'PATCH', headers: await authHeaders(),
    body: JSON.stringify({ fields: toFsFields(data) }),
  });
  if (!res.ok) throw new Error(`Firestore SET failed (${res.status})`);
  return docToObj(await res.json());
}

async function addDocument(path, data) {
  const url = `${FS_BASE()}/${path}?key=${firebaseConfig.apiKey}`;
  const res = await fetch(url, {
    method: 'POST', headers: await authHeaders(),
    body: JSON.stringify({ fields: toFsFields(data) }),
  });
  if (!res.ok) throw new Error(`Firestore ADD failed (${res.status})`);
  return docToObj(await res.json());
}

async function deleteDocument(path, id) {
  const url = `${FS_BASE()}/${path}/${id}?key=${firebaseConfig.apiKey}`;
  const res = await fetch(url, { method: 'DELETE', headers: await authHeaders() });
  if (!res.ok && res.status !== 404) throw new Error(`Firestore DELETE failed (${res.status})`);
}

async function updateFields(path, id, data) {
  const fieldPaths = Object.keys(data).map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
  const url = `${FS_BASE()}/${path}/${id}?key=${firebaseConfig.apiKey}&${fieldPaths}`;
  const res = await fetch(url, {
    method: 'PATCH', headers: await authHeaders(),
    body: JSON.stringify({ fields: toFsFields(data) }),
  });
  if (!res.ok) throw new Error(`Firestore UPDATE failed (${res.status})`);
  return docToObj(await res.json());
}

// ─── Offline sync queue ──────────────────────────────────────────────────────

const SYNC_QUEUE_KEY = 'namo_sync_queue';

function getSyncQueue() {
  try { return JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]'); } catch { return []; }
}
function setSyncQueue(q) {
  try { localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(q.slice(-50))); } catch { /* quota */ }
}

function queueFailedWrite(path, data, docId = null) {
  const q = getSyncQueue();
  q.push({ path, data, docId, queuedAt: new Date().toISOString() });
  setSyncQueue(q);
}

export async function flushSyncQueue() {
  if (!isFirebaseConfigured() || !navigator.onLine) return { flushed: 0, remaining: 0 };
  const q = getSyncQueue();
  if (!q.length) return { flushed: 0, remaining: 0 };
  const remaining = [];
  let flushed = 0;
  for (const item of q) {
    try {
      if (item.docId) await setDocument(item.path, item.docId, item.data);
      else await addDocument(item.path, item.data);
      flushed++;
    } catch { remaining.push(item); }
  }
  setSyncQueue(remaining);
  return { flushed, remaining: remaining.length };
}

async function listSubcollection(userId, sub, pageSize = 100) {
  const url = `${FS_BASE()}/users/${userId}/${sub}?key=${firebaseConfig.apiKey}&pageSize=${pageSize}`;
  const res = await fetch(url, { headers: await authHeaders() });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.documents || []).map(docToObj).filter(Boolean);
}

function buildFilter(conds) {
  if (conds.length === 1) {
    const [field, op, value] = conds[0];
    const OP = { '==': 'EQUAL', '>=': 'GREATER_THAN_OR_EQUAL', '<=': 'LESS_THAN_OR_EQUAL', '>': 'GREATER_THAN', '<': 'LESS_THAN' };
    return { fieldFilter: { field: { fieldPath: field }, op: OP[op] || op, value: toFsValue(value) } };
  }
  return { compositeFilter: { op: 'AND', filters: conds.map((c) => buildFilter([c])) } };
}

async function queryTopLevel(collectionId, conditions = [], orderByField = null, limitN = 50) {
  const url = `${FS_BASE()}:runQuery?key=${firebaseConfig.apiKey}`;
  const q = { from: [{ collectionId }] };
  if (conditions.length) q.where = buildFilter(conditions);
  if (orderByField) q.orderBy = [{ field: { fieldPath: orderByField }, direction: 'DESCENDING' }];
  if (limitN) q.limit = limitN;

  const res = await fetch(url, {
    method: 'POST', headers: await authHeaders(),
    body: JSON.stringify({ structuredQuery: q }),
  });
  if (!res.ok) return [];
  const rows = await res.json();
  return rows.filter((r) => r.document).map((r) => docToObj(r.document));
}

// ─── Domain functions ────────────────────────────────────────────────────────

export async function saveVitalRecord(userId, record) {
  if (!isFirebaseConfigured()) {
    console.log('[NaMo Care][Mock] saveVitalRecord:', record);
    return { mocked: true };
  }
  const payload = { ...record, savedAt: new Date().toISOString() };
  try {
    return await addDocument(`users/${userId}/vitalRecords`, payload);
  } catch (err) {
    console.warn('[NaMo Care] saveVitalRecord failed — queuing:', err.message);
    queueFailedWrite(`users/${userId}/vitalRecords`, payload);
    return { queued: true };
  }
}

export async function getVitalHistory(userId, days = 7) {
  if (!isFirebaseConfigured()) return [];
  try {
    const all = await listSubcollection(userId, 'vitalRecords', days * 5);
    return all.sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || ''));
  } catch { return []; }
}

export async function saveMoodEntry(userId, entry) {
  if (!isFirebaseConfigured()) {
    console.log('[NaMo Care][Mock] saveMoodEntry:', entry);
    return { mocked: true };
  }
  const payload = { ...entry, savedAt: new Date().toISOString() };
  try {
    return await addDocument(`users/${userId}/moodEntries`, payload);
  } catch (err) {
    console.warn('[NaMo Care] saveMoodEntry failed — queuing:', err.message);
    queueFailedWrite(`users/${userId}/moodEntries`, payload);
    return { queued: true };
  }
}

export async function getMoodHistory(userId, days = 7) {
  if (!isFirebaseConfigured()) return [];
  try {
    const all = await listSubcollection(userId, 'moodEntries', days * 5);
    return all.sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || ''));
  } catch { return []; }
}

export async function saveMedStatus(userId, dateKey, medsMap) {
  if (!isFirebaseConfigured()) {
    console.log('[NaMo Care][Mock] saveMedStatus:', medsMap);
    return { mocked: true };
  }
  const payload = { ...medsMap, updatedAt: new Date().toISOString() };
  try {
    return await setDocument(`users/${userId}/medStatus`, dateKey, payload);
  } catch (err) {
    console.warn('[NaMo Care] saveMedStatus failed — queuing:', err.message);
    queueFailedWrite(`users/${userId}/medStatus`, payload, dateKey);
    return { queued: true };
  }
}

export async function getMedStatus(userId, dateKey) {
  if (!isFirebaseConfigured()) return null;
  try {
    return await getDocument(`users/${userId}/medStatus`, dateKey);
  } catch { return null; }
}

export async function getMedicationSchedules(userId) {
  if (!isFirebaseConfigured()) return [];
  try {
    return await queryTopLevel('medicationSchedules',
      [['userId', '==', userId], ['isActive', '==', true]],
      'createdAt', 50);
  } catch { return []; }
}

export async function getAlerts(userId, limitN = 20) {
  if (!isFirebaseConfigured()) return [];
  try {
    return await queryTopLevel('alerts', [['userId', '==', userId]], 'triggeredAt', limitN);
  } catch { return []; }
}

export async function getDailyCheckins(userId, days = 7) {
  if (!isFirebaseConfigured()) return [];
  try {
    return await queryTopLevel('dailyCheckins', [['userId', '==', userId]], 'scheduledAt', days);
  } catch { return []; }
}

export async function getBehaviorSignals(userId, limitN = 10) {
  if (!isFirebaseConfigured()) return [];
  try {
    return await queryTopLevel('behaviorSignals', [['userId', '==', userId]], 'computedAt', limitN);
  } catch { return []; }
}

export async function acknowledgeAlert(alertId) {
  if (!isFirebaseConfigured()) return { mocked: true };
  try {
    return await updateFields('alerts', alertId, {
      status: 'acknowledged',
      acknowledgedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[NaMo Care] acknowledgeAlert failed:', err.message);
    return { mocked: true };
  }
}

export async function saveCaregiverLink(userId, caregiverLineId) {
  if (!isFirebaseConfigured()) {
    console.log('[NaMo Care][Mock] saveCaregiverLink:', caregiverLineId);
    return { mocked: true };
  }
  try {
    // Use deterministic caregiver ID so linking is idempotent
    const caregiverId = `cg_${userId}`;
    await setDocument('caregivers', caregiverId, {
      lineUserId: caregiverLineId,
      linkedUserIds: [userId],
      registeredAt: new Date().toISOString(),
    });
    return { caregiverId };
  } catch (err) {
    console.warn('[NaMo Care] saveCaregiverLink failed:', err.message);
    return { mocked: true };
  }
}

export async function getMedAdherenceWeekly(userId) {
  if (!isFirebaseConfigured()) return null;
  try {
    const statuses = await listSubcollection(userId, 'medStatus', 10);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const week = statuses.filter((s) => s.id && s.id >= cutoff.toISOString().slice(0, 10));
    const totalEntries = week.reduce((s, d) => {
      const vals = Object.entries(d).filter(([k]) => k !== 'id' && k !== 'updatedAt');
      return s + vals.length;
    }, 0);
    const takenEntries = week.reduce((s, d) => {
      const vals = Object.entries(d).filter(([k]) => k !== 'id' && k !== 'updatedAt');
      return s + vals.filter(([, v]) => v === true).length;
    }, 0);
    return {
      percentage: totalEntries > 0 ? Math.round((takenEntries / totalEntries) * 100) : null,
      daysRecorded: week.length,
    };
  } catch { return null; }
}

export async function deleteMedicationSchedule(scheduleId) {
  if (!isFirebaseConfigured()) return { mocked: true };
  try {
    await deleteDocument('medicationSchedules', scheduleId);
    return { ok: true };
  } catch (err) {
    console.warn('[NaMo Care] deleteMedicationSchedule failed:', err.message);
    return { mocked: true };
  }
}

export async function updateMedicationSchedule(scheduleId, userId, form) {
  if (!isFirebaseConfigured()) return { mocked: true };
  try {
    return await updateFields('medicationSchedules', scheduleId, {
      name: form.nameTh || form.name,
      dosage: form.dosage,
      times: [form.time],
      purpose: form.purpose,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[NaMo Care] updateMedicationSchedule failed:', err.message);
    return { mocked: true };
  }
}

export async function getRiskScoreHistory(userId) {
  if (!isFirebaseConfigured()) return [];
  try {
    const signals = await queryTopLevel('behaviorSignals', [['userId', '==', userId]], 'computedAt', 42);
    // Group scores by day (YYYY-MM-DD), take average per day
    const byDay = {};
    for (const s of signals) {
      const day = (s.computedAt || '').slice(0, 10);
      if (!day) continue;
      if (!byDay[day]) byDay[day] = { total: 0, count: 0 };
      byDay[day].total += s.score ?? 0;
      byDay[day].count += 1;
    }
    // Build last-7-days array
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const day = d.toISOString().slice(0, 10);
      const entry = byDay[day];
      result.push({ day, score: entry ? Math.round(entry.total / entry.count) : null });
    }
    return result;
  } catch { return []; }
}

export async function saveSOSAlert(payload) {
  const document = { ...payload, source: 'line-liff', triggeredAt: new Date().toISOString() };
  if (!isFirebaseConfigured()) {
    const id = `mock_sos_${Date.now()}`;
    console.warn('[NaMo Care] Firebase not configured — mock SOS write.');
    return { id, mocked: true };
  }
  try {
    return await addDocument('sos_events', document);
  } catch (err) {
    console.warn('[NaMo Care] saveSOSAlert failed:', err.message);
    return { id: `err_${Date.now()}`, mocked: true };
  }
}

// ─── Auth façade ─────────────────────────────────────────────────────────────

export const auth = {
  get currentUser() {
    const s = loadAuth();
    if (!s?.localId) return null;
    return { uid: s.localId, provider: 'anonymous' };
  },
  signIn: async () => {
    if (!isFirebaseConfigured()) {
      return { uid: 'local_user', displayName: 'คุณยาย สมศรี', provider: 'mock' };
    }
    try {
      const d = await (loadAuth()?.localId ? Promise.resolve(loadAuth()) : doAnonSignIn());
      return { uid: d.localId, displayName: null, provider: 'anonymous' };
    } catch {
      return { uid: 'local_user', displayName: null, provider: 'fallback' };
    }
  },
  // LINE LIFF integration placeholder — replace with Firebase Custom Token once LIFF is set up
  signInWithLINE: async () => auth.signIn(),
  signOut: async () => { localStorage.removeItem(AUTH_KEY); },
};

// ─── Compatibility db wrapper ────────────────────────────────────────────────

export const db = {
  collection: (name) => ({
    add: (data) => {
      if (!isFirebaseConfigured()) return Promise.resolve({ id: `mock_${Date.now()}`, mocked: true });
      return addDocument(name, data);
    },
    doc: (id) => ({
      get: async () => {
        if (!isFirebaseConfigured()) return { exists: false, data: () => null };
        try {
          const doc = await getDocument(name, id);
          return { exists: !!doc, data: () => doc };
        } catch { return { exists: false, data: () => null }; }
      },
      set: async (data) => {
        if (!isFirebaseConfigured()) return { id, mocked: true };
        return setDocument(name, id, data);
      },
      update: async (data) => {
        if (!isFirebaseConfigured()) return { id, mocked: true };
        const fieldPaths = Object.keys(data).map((k) => `updateMask.fieldPaths=${k}`).join('&');
        const url = `${FS_BASE()}/${name}/${id}?key=${firebaseConfig.apiKey}&${fieldPaths}`;
        const res = await fetch(url, {
          method: 'PATCH', headers: await authHeaders(),
          body: JSON.stringify({ fields: toFsFields(data) }),
        });
        if (!res.ok) throw new Error(`update failed (${res.status})`);
        return docToObj(await res.json());
      },
    }),
  }),
};

export default firebaseConfig;
