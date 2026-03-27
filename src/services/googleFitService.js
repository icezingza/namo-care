const CLIENT_ID = import.meta.env.VITE_GOOGLE_FIT_CLIENT_ID ?? '';
const REDIRECT_URI = window.location.origin;
const SCOPES = [
  'https://www.googleapis.com/auth/fitness.heart_rate.read',
  'https://www.googleapis.com/auth/fitness.blood_pressure.read',
].join(' ');

const TOKEN_KEY = 'namo_google_fit_token';
const VERIFIER_KEY = 'namo_gfit_verifier';
export const PENDING_CODE_KEY = 'namo_gfit_pending_code';

// PKCE helpers
function generateVerifier() {
  const arr = new Uint8Array(48);
  crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function generateChallenge(verifier) {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export async function startGoogleFitConnect() {
  if (!CLIENT_ID) {
    throw new Error('ยังไม่ได้ตั้งค่า VITE_GOOGLE_FIT_CLIENT_ID — กรุณาแจ้งผู้ดูแลระบบ');
  }
  const verifier = generateVerifier();
  const challenge = await generateChallenge(verifier);
  localStorage.setItem(VERIFIER_KEY, verifier);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    access_type: 'offline',
    prompt: 'consent',
  });
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function handleGoogleFitCallback(code) {
  const verifier = localStorage.getItem(VERIFIER_KEY);
  if (!verifier) throw new Error('ไม่พบ session — กรุณาลองเชื่อมต่อใหม่อีกครั้ง');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
      code,
      code_verifier: verifier,
    }),
  });
  if (!res.ok) throw new Error('เชื่อมต่อ Google Fit ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');

  const data = await res.json();
  localStorage.setItem(TOKEN_KEY, JSON.stringify({
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  }));
  localStorage.removeItem(VERIFIER_KEY);
}

function getStoredToken() {
  try { return JSON.parse(localStorage.getItem(TOKEN_KEY) ?? 'null'); }
  catch { return null; }
}

export function isGoogleFitConnected() {
  return getStoredToken() !== null;
}

export function disconnectGoogleFit() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(VERIFIER_KEY);
  localStorage.removeItem(PENDING_CODE_KEY);
}

async function getValidAccessToken() {
  const token = getStoredToken();
  if (!token) throw new Error('ยังไม่ได้เชื่อมต่อ Google Fit');
  if (Date.now() < token.expiresAt - 60_000) return token.accessToken;

  if (!token.refreshToken) {
    disconnectGoogleFit();
    throw new Error('Session หมดอายุ กรุณาเชื่อมต่อใหม่อีกครั้ง');
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'refresh_token',
      refresh_token: token.refreshToken,
    }),
  });
  if (!res.ok) { disconnectGoogleFit(); throw new Error('Session หมดอายุ กรุณาเชื่อมต่อใหม่อีกครั้ง'); }

  const data = await res.json();
  localStorage.setItem(TOKEN_KEY, JSON.stringify({
    ...token,
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  }));
  return data.access_token;
}

async function fetchAggregate(accessToken, dataTypeNames) {
  const nowMs = Date.now();
  const dayStartMs = nowMs - (nowMs % 86_400_000);
  const res = await fetch('https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      aggregateBy: dataTypeNames.map((d) => ({ dataTypeName: d })),
      bucketByTime: { durationMillis: 86_400_000 },
      startTimeMillis: dayStartMs,
      endTimeMillis: nowMs,
    }),
  });
  if (!res.ok) throw new Error('เรียกข้อมูลจาก Google Fit ไม่สำเร็จ');
  return res.json();
}

function evalHR(bpm) {
  if (bpm >= 60 && bpm <= 100) return { status: 'normal', text: 'ปกติ ✓', color: 'text-serenity-green' };
  if (bpm >= 50 && bpm <= 110) return { status: 'warning', text: 'เฝ้าระวัง ⚠️', color: 'text-warm' };
  return { status: 'danger', text: 'ผิดปกติ! ⚠️', color: 'text-danger' };
}

function evalBP(sys, dia) {
  if (sys < 120 && dia < 80) return { status: 'normal', text: 'ปกติ ✓', color: 'text-serenity-green' };
  if (sys < 140 && dia < 90) return { status: 'warning', text: 'เฝ้าระวัง ⚠️', color: 'text-warm' };
  return { status: 'danger', text: 'สูงผิดปกติ! ⚠️', color: 'text-danger' };
}

// Returns array of synced vital type strings e.g. ['heartRate', 'bloodPressure']
export async function syncGoogleFitVitals(userId, saveVitalRecord) {
  const accessToken = await getValidAccessToken();
  const now = new Date();
  const timestamp = now.toISOString();
  const dateKey = timestamp.slice(0, 10);
  const synced = [];

  // Heart rate
  try {
    const data = await fetchAggregate(accessToken, ['com.google.heart_rate.summary']);
    // index 1 = average (summary has: min, average, max)
    const point = data.bucket?.[0]?.dataset?.[0]?.point?.[0];
    const avg = Math.round(point?.value?.[1]?.fpVal ?? point?.value?.[0]?.fpVal ?? 0);
    if (avg > 0) {
      await saveVitalRecord(userId, {
        type: 'heartRate', values: { value: avg },
        evaluation: evalHR(avg), timestamp, dateKey, source: 'google_fit',
      });
      synced.push('heartRate');
    }
  } catch { /* heart rate not available today */ }

  // Blood pressure
  try {
    const data = await fetchAggregate(accessToken, ['com.google.blood_pressure']);
    const point = data.bucket?.[0]?.dataset?.[0]?.point?.[0];
    const sys = Math.round(point?.value?.[0]?.fpVal ?? 0);
    const dia = Math.round(point?.value?.[1]?.fpVal ?? 0);
    if (sys > 0 && dia > 0) {
      await saveVitalRecord(userId, {
        type: 'bloodPressure', values: { systolic: sys, diastolic: dia },
        evaluation: evalBP(sys, dia), timestamp, dateKey, source: 'google_fit',
      });
      synced.push('bloodPressure');
    }
  } catch { /* blood pressure not available from device */ }

  return synced;
}
