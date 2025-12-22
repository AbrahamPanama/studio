'use client';

import { useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth';
import { useFirebaseApp } from '@/firebase/provider';

interface UserState {
  user: User | null;
  isUserLoading: boolean;
  error: Error | null;
}

export function useUser(): UserState {
  const firebaseApp = useFirebaseApp();
  const [userState, setUserState] = useState<UserState>({
    user: null,
    isUserLoading: true,
    error: null,
  });

  useEffect(() => {
    if (!firebaseApp) {
      setUserState({
        user: null,
        isUserLoading: false,
        error: new Error("Firebase app is not initialized."),
      });
      return;
    }
    
    const auth = getAuth(firebaseApp);

    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        setUserState({ user, isUserLoading: false, error: null });
      },
      (error) => {
        console.error("useUser: onAuthStateChanged error:", error);
        setUserState({ user: null, isUserLoading: false, error });
      }
    );

    return () => unsubscribe();
  }, [firebaseApp]);

  return userState;
}
