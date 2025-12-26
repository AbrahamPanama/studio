
import admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    // App Hosting provides project configuration in an environment variable.
    // Parsing it ensures we are targeting the correct project.
    const firebaseConfig = process.env.FIREBASE_CONFIG ? JSON.parse(process.env.FIREBASE_CONFIG) : {};
    const projectId = firebaseConfig.projectId;

    if (projectId) {
      admin.initializeApp({ projectId });
    } else {
      // Fallback for local development or other environments
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    }
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
}

export const db = admin.firestore();
