'use client';

import { useUser } from '@/firebase/auth/use-user'; // Adjust import path if needed
import { useEffect, useState } from 'react';

export default function DebugPage() {
  const { user } = useUser();
  const [config, setConfig] = useState<any>({});

  useEffect(() => {
    // Only verify client-side loaded vars
    setConfig({
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'Loaded ✅' : 'Missing ❌',
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  }, []);

  // Simple security: only allow if user is logged in (or you can remove this check temporarily)
  if (!user) return <div className="p-10">Access Denied. Please login first.</div>;

  return (
    <div className="p-10 font-mono space-y-4">
      <h1 className="text-2xl font-bold">Environment Debugger</h1>
      <div className="bg-gray-100 p-6 rounded shadow-md border border-gray-300">
        <p><strong>Project ID:</strong> {config.projectId || 'UNDEFINED'}</p>
        <p><strong>API Key Status:</strong> {config.apiKey}</p>
        <p><strong>Auth Domain:</strong> {config.authDomain || 'UNDEFINED'}</p>
        <p><strong>Storage Bucket:</strong> {config.storageBucket || 'UNDEFINED'}</p>
      </div>
      <p className="text-sm text-gray-500 mt-4">
        If Project ID is "undefined" or differs from your local <code>.env.local</code>, 
        you need to add these variables to your Vercel/Hosting dashboard.
      </p>
    </div>
  );
}
