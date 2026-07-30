import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Vite inlines these at build time, so a missing value surfaces later as a
// confusing Firebase error. Detect it up front and let the UI say so plainly.
export const missingEnvKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

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
