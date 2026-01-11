'use client';

import { useFirebase } from '@/firebase/provider';
import type { User } from 'firebase/auth';

interface UserState {
  user: User | null;
  isUserLoading: boolean;
  error: Error | null;
}

export function useUser(): UserState {
  const { user, isUserLoading, userError } = useFirebase();
  return { user, isUserLoading, error: userError };
}
