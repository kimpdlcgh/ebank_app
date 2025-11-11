import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

// Validate required environment variables
const requiredEnvVars = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Check for missing required environment variables
const missingVars = Object.entries(requiredEnvVars)
  .filter(([key, value]) => !value)
  .map(([key]) => `VITE_FIREBASE_${key.toUpperCase().replace(/([A-Z])/g, '_$1')}`);

if (missingVars.length > 0) {
  throw new Error(
    `Missing required Firebase environment variables: ${missingVars.join(', ')}\n` +
    'Please check your .env file and ensure all Firebase configuration variables are set.'
  );
}

// Firebase configuration - production ready
const firebaseConfig = {
  apiKey: requiredEnvVars.apiKey,
  authDomain: requiredEnvVars.authDomain,
  projectId: requiredEnvVars.projectId,
  storageBucket: requiredEnvVars.storageBucket,
  messagingSenderId: requiredEnvVars.messagingSenderId,
  appId: requiredEnvVars.appId,
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