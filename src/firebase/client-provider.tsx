'use client';

import React, { useMemo, type ReactNode, useState, useEffect } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

interface FirebaseServices {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  // Use state to hold the initialized services. Start with null.
  const [firebaseServices, setFirebaseServices] = useState<FirebaseServices | null>(null);

  // useEffect with an empty dependency array runs only once on the client, after mount.
  useEffect(() => {
    // This is the correct place to initialize client-side services.
    // The environment variables (process.env.NEXT_PUBLIC_*) are guaranteed to be available here.
    const services = initializeFirebase();
    setFirebaseServices(services);
  }, []); // Empty array ensures this runs only once on the client.

  // While services are being initialized, we can show a loading state or nothing.
  // This prevents children from trying to access Firebase before it's ready.
  if (!firebaseServices) {
    // You can return a global loading spinner here if desired
    return null; 
  }

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
