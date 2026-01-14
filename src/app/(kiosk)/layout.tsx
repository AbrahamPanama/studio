import '../globals.css';
import { FirebaseClientProvider } from '@/firebase';

export default function KioskLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className="antialiased bg-slate-100 min-h-screen">
                <main className="w-full h-full">
                    <FirebaseClientProvider>
                        {children}
                    </FirebaseClientProvider>
                </main>
            </body>
        </html>
    );
}
