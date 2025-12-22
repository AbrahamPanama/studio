'use client';

import React from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { Button } from '@/components/ui/button';
import { getAuth } from 'firebase/auth';
import { 
  initiateEmailSignIn,
  initiateAnonymousSignIn 
} from '@/firebase/non-blocking-login';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

const ADMIN_EMAILS = ['abraham.saenz@gmail.com', 'vacardspanama@gmail.com'];

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const auth = getAuth();

  const handleSignIn = async () => {
    try {
      initiateEmailSignIn(auth, email, password);
    } catch (e: any) {
      setError(e.message);
    }
  };
  
  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-100 dark:bg-gray-900">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Login</CardTitle>
            <CardDescription>
              Enter your email below to login to your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
             {error && <p className="text-sm text-red-500">{error}</p>}
            <Button onClick={handleSignIn} className="w-full">
              Sign in
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user.email || !ADMIN_EMAILS.includes(user.email)) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center">
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="mb-4">You are not authorized to view this page.</p>
        <Button onClick={() => auth.signOut()}>Sign Out</Button>
      </div>
    );
  }

  return <>{children}</>;
}
