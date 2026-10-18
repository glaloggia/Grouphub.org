import * as admin from 'firebase-admin';
import { App, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getStorage, Storage } from 'firebase-admin/storage';

const ADMIN_APP_NAME = 'firebase-admin-app-grouphub';

function getAdminApp(): App {
  const existingApp = getApps().find(app => app.name === ADMIN_APP_NAME);
  if (existingApp) {
    return existingApp;
  }
  
  try {
    // initializeApp with no arguments uses GOOGLE_APPLICATION_CREDENTIALS 
    // or internal environment metadata in Google Cloud / Firebase Studio.
    const newApp = initializeApp({}, ADMIN_APP_NAME);
    return newApp;
  } catch (error) {
    console.error("[FirebaseAdmin] Initialization failed. Attempting to use default app or re-connect.");
    const defaultApp = getApps().find(app => app.name === '[DEFAULT]');
    if (defaultApp) return defaultApp;
    
    throw new Error(`Failed to initialize Firebase Admin SDK: ${(error as Error).message}`);
  }
}

export function getAdminFirestoreInstance(): Firestore {
  return getFirestore(getAdminApp());
}

export function getAdminAuthInstance(): Auth {
  return getAuth(getAdminApp());
}

export function getAdminStorageInstance(): Storage {
    const app = getAdminApp();
    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${app.options.projectId}.appspot.com`;
    return getStorage(app, `gs://${bucketName}`);
}

export async function verifyIdTokenAndGetUid(idToken: string): Promise<string> {
  const adminAuth = getAdminAuthInstance();
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    return decodedToken.uid;
  } catch (error) {
    console.error('[FirebaseAdmin - verifyIdTokenAndGetUid] Error verifying ID token:', error);
    throw new Error(`ID token verification failed: ${(error as Error).message}`);
  }
}

export function safeParseFirestoreTimestamp(timestamp: any): string {
    if (!timestamp) {
      return new Date(0).toISOString();
    }
    try {
      if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toISOString();
      }
      const d = new Date(timestamp);
      if (isNaN(d.getTime())) {
        return new Date(0).toISOString();
      }
      return d.toISOString();
    } catch (error) {
      console.warn(`[safeParseFirestoreTimestamp] Could not parse timestamp:`, timestamp, `Falling back to epoch. Error:`, error);
      return new Date(0).toISOString();
    }
}

export function safeParseDateOnlyString(dateValue: any): string {
  if (!dateValue) {
    return new Date().toISOString().split('T')[0];
  }
  if (dateValue && typeof dateValue.toDate === 'function') {
    return dateValue.toDate().toISOString().split('T')[0];
  }
  if (typeof dateValue === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        const parsedDate = new Date(dateValue + "T00:00:00Z");
        if (!isNaN(parsedDate.getTime())) {
            return dateValue;
        }
    }
    const parsedDate = new Date(dateValue);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString().split('T')[0];
    }
  }
  if (typeof dateValue === 'number') {
    const parsedDate = new Date(dateValue);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString().split('T')[0];
    }
  }
  return new Date().toISOString().split('T')[0];
}
