/**
 * Firebase gateway for NaMo Care.
 *
 * This module writes SOS events to Firestore via REST API so the app can
 * run without the Firebase JS SDK bundle. If config is missing, it falls
 * back to a mock writer to keep local development usable.
 */

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

const REQUIRED_CONFIG_KEYS = ['apiKey', 'projectId'];

function hasRequiredFirebaseConfig() {
  return REQUIRED_CONFIG_KEYS.every((key) => firebaseConfig[key]);
}

function toFirestoreFields(obj) {
  const fields = {};
  Object.entries(obj).forEach(([key, value]) => {
    if (value === undefined) return;
    fields[key] = toFirestoreValue(value);
  });
  return fields;
}

function toFirestoreValue(value) {
  if (value === null) return { nullValue: null };
  if (value instanceof Date) return { timestampValue: value.toISOString() };

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return { arrayValue: {} };
    }
    return {
      arrayValue: {
        values: value.map((item) => toFirestoreValue(item)),
      },
    };
  }

  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }

  if (typeof value === 'object') {
    return {
      mapValue: {
        fields: toFirestoreFields(value),
      },
    };
  }

  return { stringValue: String(value) };
}

async function addFirestoreDocument(collectionPath, data) {
  const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/${collectionPath}?key=${firebaseConfig.apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: toFirestoreFields(data),
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const message = errorBody?.error?.message || `Firestore write failed (${response.status})`;
    throw new Error(message);
  }

  const doc = await response.json();
  const id = doc?.name?.split('/').pop() || null;
  return { id, raw: doc, mocked: false };
}

export async function saveSOSAlert(payload) {
  const document = {
    ...payload,
    source: 'line-liff',
    triggeredAt: new Date().toISOString(),
  };

  if (!hasRequiredFirebaseConfig()) {
    const id = `mock_sos_${Date.now()}`;
    console.warn('[NaMo Care] Firebase is not configured. Falling back to mock write.');
    console.log('[NaMo Care][Mock] sos_events:', { id, ...document });
    return { id, mocked: true };
  }

  return addFirestoreDocument('sos_events', document);
}

export function isFirebaseConfigured() {
  return hasRequiredFirebaseConfig();
}

// Temporary mock auth API for current MVP flows.
export const auth = {
  currentUser: null,
  signInWithLINE: async () => {
    const mockUser = {
      uid: 'line_somsri_001',
      displayName: 'Grandma Somsri',
      photoURL: null,
      provider: 'line.me',
    };
    auth.currentUser = mockUser;
    return mockUser;
  },
  signOut: async () => {
    auth.currentUser = null;
  },
};

// Compatibility wrapper for existing code paths.
export const db = {
  collection: (name) => ({
    add: (data) => addFirestoreDocument(name, data),
    doc: (id) => ({
      get: async () => ({ exists: false, data: () => ({ id }) }),
      set: async (data) => {
        console.warn(`[NaMo Care] db.collection(${name}).doc(${id}).set is not implemented in REST wrapper.`);
        console.log('[NaMo Care][Mock] set payload:', data);
        return { id, mocked: true };
      },
      update: async (data) => {
        console.warn(`[NaMo Care] db.collection(${name}).doc(${id}).update is not implemented in REST wrapper.`);
        console.log('[NaMo Care][Mock] update payload:', data);
        return { id, mocked: true };
      },
    }),
  }),
};

export default firebaseConfig;
