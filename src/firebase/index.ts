'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage'; // <--- Added Import

// Singleton initialization for direct access
// This ensures we don't re-initialize the app if it already exists
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Export instances directly so they can be imported elsewhere
export const auth = getAuth(app);
export const firestore = getFirestore(app);
export const storage = getStorage(app); // <--- Added Export

// Helper for Context/Providers (Legacy support for your existing code)
export function initializeFirebase() {
  return getSdks(app);
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp),
    storage: getStorage(firebaseApp) // <--- Added to SDKs object
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';