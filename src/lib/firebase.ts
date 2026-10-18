import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth as _getAuth, type Auth } from "firebase/auth";
import { getStorage as _getStorage, type FirebaseStorage } from "firebase/storage";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAnalytics, isSupported as isAnalyticsSupported, type Analytics } from "firebase/analytics";


import appletConfig from "../../firebase-applet-config.json";

// Firebase configuration loaded from environment variables or firebase-applet-config.json
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || appletConfig.apiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || appletConfig.authDomain || `${appletConfig.projectId}.firebaseapp.com`,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || appletConfig.projectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || appletConfig.storageBucket,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || appletConfig.messagingSenderId,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || appletConfig.appId,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || appletConfig.measurementId
};

// Memoize instances to avoid re-initializing
let appInstance: FirebaseApp | undefined;
let authInstance: Auth | undefined;
let storageInstance: FirebaseStorage | undefined;
let firestoreInstance: Firestore | undefined;
let analyticsInstance: Analytics | undefined;


export function getFirebaseApp(): FirebaseApp {
  if (!appInstance) {
    if (getApps().length === 0) {
      if (firebaseConfig.apiKey && firebaseConfig.projectId) {
        try {
          appInstance = initializeApp(firebaseConfig);
        } catch (e) {
          console.error('[Firebase] CRITICAL ERROR during initializeApp in getFirebaseApp:', e);
          throw new Error(`Firebase project configuration is incomplete or invalid. Cannot initialize Firebase app. Details: ${(e as Error).message}. Ensure NEXT_PUBLIC_FIREBASE_API_KEY and NEXT_PUBLIC_FIREBASE_PROJECT_ID (and other NEXT_PUBLIC_FIREBASE_* variables) are set correctly.`);
        }
      } else {
        const missingKeys = [];
        if (!firebaseConfig.apiKey) missingKeys.push("NEXT_PUBLIC_FIREBASE_API_KEY");
        if (!firebaseConfig.projectId) missingKeys.push("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
        if (!firebaseConfig.storageBucket) missingKeys.push("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET");
        console.error(`[Firebase] CRITICAL ERROR: Missing required Firebase config keys: ${missingKeys.join(', ')}. Cannot initialize.`);
        throw new Error(`Firebase project configuration is incomplete (Missing: ${missingKeys.join(', ')}). Ensure all NEXT_PUBLIC_FIREBASE_* variables are set in your .env.local file and the server is restarted.`);
      }
    } else {
      appInstance = getApp();
    }
  }
  if (!appInstance) {
    throw new Error("[Firebase] CRITICAL: Firebase app instance is still undefined after initialization attempt.");
  }
  return appInstance;
}

export function getFirebaseAuth(): Auth {
  if (!authInstance) {
    const app = getFirebaseApp(); 
    authInstance = _getAuth(app);
  }
  if (!authInstance) {
    throw new Error("[Firebase] CRITICAL: Firebase auth instance is still undefined after initialization attempt.");
  }
  return authInstance;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (!storageInstance) {
    const app = getFirebaseApp();
    storageInstance = _getStorage(app);
  }
  if (!storageInstance) {
    throw new Error("[Firebase] CRITICAL: Firebase storage instance is still undefined after initialization attempt.");
  }
  return storageInstance;
}

export function getFirebaseFirestore(): Firestore {
  if (!firestoreInstance) {
    const app = getFirebaseApp();
    const dbId = process.env.NEXT_PUBLIC_FIRESTORE_DATABASE_ID || appletConfig.firestoreDatabaseId;
    firestoreInstance = dbId ? getFirestore(app, dbId) : getFirestore(app);
  }
  if (!firestoreInstance) {
    throw new Error("[Firebase] CRITICAL: Firebase firestore instance is still undefined after initialization attempt.");
  }
  return firestoreInstance;
}

export function initializeAnalytics() {
  if (typeof window !== 'undefined') {
    isAnalyticsSupported().then(isSupported => {
      if (isSupported && !analyticsInstance) {
        const app = getFirebaseApp();
        analyticsInstance = getAnalytics(app);
        console.log("Firebase Analytics initialized.");
      }
    });
  }
}
