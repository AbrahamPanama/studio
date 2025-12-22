import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import Header from '@/components/layout/header';
import { FirebaseClientProvider } from '@/firebase';
import { AuthGate } from '@/components/auth/auth-gate';

export const metadata: Metadata = {
  title: 'VA OMS',
  description: 'Lightweight Order Management System',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body min-h-screen bg-background text-foreground">
        <FirebaseClientProvider>
          <AuthGate>
            <div className="relative flex min-h-screen flex-col">
              <Header />
              <main className="flex-1">
                {children}
              </main>
            </div>
          </AuthGate>
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
