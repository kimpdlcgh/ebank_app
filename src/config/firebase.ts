import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

const requiredFirebaseEnvKeys = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

const firebaseEnvConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const legacyDevFallbackConfig = {
  apiKey: 'AIzaSyAu5kKrpCK5eCQVl9qkRKkxICqAF9JaVxc',
  authDomain: 'frbr-ebank.firebaseapp.com',
  projectId: 'frbr-ebank',
  storageBucket: 'frbr-ebank.firebasestorage.app',
  messagingSenderId: '988511047482',
  appId: '1:988511047482:web:0226d38b4c0647c05c4a03',
};

const missingFirebaseEnvKeys = requiredFirebaseEnvKeys.filter((key) => !import.meta.env[key]?.trim());

if (import.meta.env.PROD && missingFirebaseEnvKeys.length > 0) {
  throw new Error(
    `Missing Firebase environment variables: ${missingFirebaseEnvKeys.join(', ')}. ` +
      'Set the exact production web app config in your deployment environment before building.'
  );
}

if (import.meta.env.DEV && missingFirebaseEnvKeys.length > 0) {
  console.warn(
    `Using legacy Firebase development fallback because these env vars are missing: ${missingFirebaseEnvKeys.join(', ')}`
  );
}

const firebaseConfigValues = missingFirebaseEnvKeys.length === 0
  ? firebaseEnvConfig
  : legacyDevFallbackConfig;

// Firebase configuration - production ready
const firebaseConfig = {
  apiKey: firebaseConfigValues.apiKey,
  authDomain: firebaseConfigValues.authDomain,
  projectId: firebaseConfigValues.projectId,
  storageBucket: firebaseConfigValues.storageBucket,
  messagingSenderId: firebaseConfigValues.messagingSenderId,
  appId: firebaseConfigValues.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID, // Optional
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Configure Firestore settings for better offline handling
import { enableNetwork, disableNetwork, connectFirestoreEmulator } from 'firebase/firestore';

// Enable offline persistence and better error handling
if (!import.meta.env.DEV) {
  // In production, enable network retry
  enableNetwork(db).catch((error) => {
    console.warn('Failed to enable Firestore network:', error);
  });
}

// Connect to emulators in development (if enabled)
if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_FIREBASE_EMULATORS === 'true') {
  import('firebase/auth').then(({ connectAuthEmulator }) => {
    try {
      connectAuthEmulator(auth, 'http://localhost:9099');
      console.info('🔧 Connected to Firebase Auth Emulator');
    } catch (error) {
      console.warn('⚠️ Failed to connect to Auth Emulator:', error);
    }
  });

  import('firebase/firestore').then(({ connectFirestoreEmulator }) => {
    try {
      connectFirestoreEmulator(db, 'localhost', 8080);
      console.info('🔧 Connected to Firestore Emulator');
    } catch (error) {
      console.warn('⚠️ Failed to connect to Firestore Emulator:', error);
    }
  });

  import('firebase/storage').then(({ connectStorageEmulator }) => {
    try {
      connectStorageEmulator(storage, 'localhost', 9199);
      console.info('🔧 Connected to Storage Emulator');
    } catch (error) {
      console.warn('⚠️ Failed to connect to Storage Emulator:', error);
    }
  });

  import('firebase/functions').then(({ connectFunctionsEmulator }) => {
    try {
      connectFunctionsEmulator(functions, 'localhost', 5001);
      console.info('🔧 Connected to Functions Emulator');
    } catch (error) {
      console.warn('⚠️ Failed to connect to Functions Emulator:', error);
    }
  });
}

export { app };
export default app;