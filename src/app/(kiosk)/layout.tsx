
import '../globals.css';
import { FirebaseClientProvider } from '@/firebase';
import { Toaster } from "@/components/ui/toaster"; // Import Toaster

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
                <Toaster />
            </body>
        </html>
    );
}
