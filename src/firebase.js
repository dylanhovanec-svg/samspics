import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

// Values pasted into .env pick up trailing spaces and carriage returns easily,
// and Vite passes them through verbatim. A key with a stray \r is non-empty, so
// it looks configured and then fails at the first call with a misleading
// "api-key-not-valid". Trim before use.
const clean = (v) => (typeof v === 'string' ? v.trim() : v);

const firebaseConfig = {
  apiKey: clean(import.meta.env.VITE_FIREBASE_API_KEY),
  authDomain: clean(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
  projectId: clean(import.meta.env.VITE_FIREBASE_PROJECT_ID),
  storageBucket: clean(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: clean(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
  appId: clean(import.meta.env.VITE_FIREBASE_APP_ID),
};

export const missingEnvKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

// Present-but-wrong is harder to spot than absent, so check the shapes too.
// Firebase web API keys are 39 characters beginning with AIza.
export const configWarnings = [];
if (firebaseConfig.apiKey && !/^AIza[\w-]{35}$/.test(firebaseConfig.apiKey)) {
  configWarnings.push(
    `VITE_FIREBASE_API_KEY does not look like a Firebase key — got ${firebaseConfig.apiKey.length} characters starting "${firebaseConfig.apiKey.slice(0, 6)}". Expected 39 starting "AIza".`
  );
}
if (firebaseConfig.projectId && !/^[a-z0-9-]+$/.test(firebaseConfig.projectId)) {
  configWarnings.push(`VITE_FIREBASE_PROJECT_ID contains unexpected characters: "${firebaseConfig.projectId}"`);
}
if (firebaseConfig.appId && !firebaseConfig.appId.includes(':web:')) {
  configWarnings.push('VITE_FIREBASE_APP_ID does not contain ":web:" — it may be the wrong app.');
}

export const isConfigured = missingEnvKeys.length === 0;

// Initializing with a half-empty config throws on first use rather than here,
// which makes the failure hard to trace. Skip it entirely when unconfigured so
// the app still renders and can explain what's missing.
const app = isConfigured ? initializeApp(firebaseConfig) : null;

export const db = app ? getFirestore(app) : null;
export const storage = app ? getStorage(app) : null;
export const auth = app ? getAuth(app) : null;

// Firebase retries a failing upload for two minutes by default. On venue wifi
// that leaves a guest watching a dead "Sending…" button with no way to judge
// whether it's working. Fail fast enough to offer them a retry instead.
if (storage) {
  storage.maxUploadRetryTime = 20000;
  storage.maxOperationRetryTime = 20000;
}

export default app;
