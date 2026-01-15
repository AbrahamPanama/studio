
'use client';

import { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, query, where, addDoc, Timestamp } from 'firebase/firestore';
import { firestore, storage } from '@/firebase';
import { Employee } from '@/lib/types-timekeeper';
import { verifyEmployeeFace } from '../actions';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Camera, RefreshCw, User } from 'lucide-react';
import Webcam from 'react-webcam';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

export default function TimeclockPage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [authMethod, setAuthMethod] = useState<'FACE' | 'PIN'>('FACE');
    const [pinInput, setPinInput] = useState('');
    const webcamRef = useRef<Webcam>(null);
    const { toast } = useToast();

    // Load Active Employees
    useEffect(() => {
        const q = query(collection(firestore, 'employees'), where('isActive', '==', true));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Employee[];
            setEmployees(data);
        });
        return () => unsubscribe();
    }, []);

    const handleCardClick = (emp: Employee) => {
        setSelectedEmployee(emp);
        setAuthMethod('FACE');
        setPinInput('');
        setIsDialogOpen(true);
    };

    const captureAndVerify = async () => {
        if (!webcamRef.current || !selectedEmployee) return;

        // FIX 1: Explicitly check for camera readiness
        const screenshot = webcamRef.current.getScreenshot();
        
        if (!screenshot) {
            // FIX 2: Stop the silence! Tell the user what's wrong.
            toast({ 
                title: "Camera not ready", 
                description: "Please wait a moment or try moving closer.", 
                variant: "destructive" 
            });
            return;
        }

        setVerifying(true);
        try {
            // 1. Verify Face
            const result = await verifyEmployeeFace(selectedEmployee.photoUrl, screenshot);

            if (result.isMatch) {
                await recordTimeEntry(selectedEmployee, 'FACE', screenshot);
                toast({ title: `Welcome, ${selectedEmployee.name}!`, className: "bg-green-600 text-white" });
                setIsDialogOpen(false);
            } else {
                toast({ title: "Face mismatch", description: "Please try again or use PIN.", variant: "destructive" });
                // Optional: Shake logic here could be added with animation classes
            }
        } catch (error: any) {
            console.error("Verification Error:", error);
            // FIX 3: Show the actual error message from the database
            toast({ 
                title: "System Error", 
                description: error.message || "Could not connect to database.", 
                variant: "destructive" 
            });
        } finally {
            setVerifying(false);
        }
    };

    const handlePinSubmit = async () => {
        if (!selectedEmployee) return;
        // CORRECTED: Compare pinInput with the selectedEmployee's pin
        if (pinInput === selectedEmployee.pin) {
            setVerifying(true);
            try {
                await recordTimeEntry(selectedEmployee, 'PIN');
                toast({ title: `Welcome, ${selectedEmployee.name}!`, className: "bg-green-600 text-white" });
                setIsDialogOpen(false);
            } catch (e: any) {
                toast({ title: "Error", description: e.message || "Could not record time entry.", variant: "destructive" });
            } finally {
                setVerifying(false);
            }
        } else {
            toast({ title: "Invalid PIN", variant: "destructive" });
            setPinInput('');
        }
    };

    const recordTimeEntry = async (employee: Employee, method: 'FACE' | 'PIN', snapshotBase64?: string) => {
        let snapshotUrl = undefined;
        // Upload snapshot if exists
        if (snapshotBase64) {
            const snapshotRef = ref(storage, `time_snapshots/${employee.id}_${Date.now()}.jpg`);
            await uploadString(snapshotRef, snapshotBase64, 'data_url');
            snapshotUrl = await getDownloadURL(snapshotRef);
        }
        
        // Timeout wrapper for Cloud Operations
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Database operation timed out")), 30000)
        );

        await Promise.race([
            addDoc(collection(firestore, 'time_entries'), {
                employeeId: employee.id,
                employeeName: employee.name,
                type: 'CLOCK_IN',
                timestamp: Timestamp.now(),
                method,
                snapshotUrl
            }),
            timeoutPromise
        ]);
    };

    return (
        <div className="p-8 min-h-screen">
            <h1 className="text-4xl font-bold text-center mb-12 text-slate-800">Timekeeper</h1>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {employees.map((emp) => (
                    <Card
                        key={emp.id}
                        className="cursor-pointer hover:shadow-xl transition-all border-2 border-transparent hover:border-slate-300 active:scale-95"
                        onClick={() => handleCardClick(emp)}
                    >
                        <CardContent className="p-6 flex flex-col items-center gap-4">
                            <div className="h-32 w-32 rounded-full overflow-hidden bg-slate-200 border-4 border-white shadow-sm">
                                {emp.photoUrl ? (
                                    <img src={emp.photoUrl} alt={emp.name} className="h-full w-full object-cover" />
                                ) : (
                                    <User className="h-full w-full p-4 text-slate-400" />
                                )}
                            </div>
                            <div className="text-center">
                                <h3 className="text-xl font-bold text-slate-900">{emp.name}</h3>
                                <p className="text-slate-500">Tap to Clock In</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <div className="flex flex-col items-center text-center space-y-4 py-4">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold text-center">
                                {authMethod === 'FACE' ? 'Biometric Check' : 'Enter PIN'}
                            </DialogTitle>
                            <DialogDescription className="text-center">
                                Verifying {selectedEmployee?.name}
                            </DialogDescription>
                        </DialogHeader>

                        {authMethod === 'FACE' ? (
                            <div className="relative rounded-lg overflow-hidden border-2 border-slate-200 bg-black aspect-[4/3] w-full max-w-[320px]">
                                <Webcam
                                    ref={webcamRef}
                                    screenshotFormat="image/jpeg"
                                    screenshotQuality={0.7}
                                    width={480}
                                    height={360}
                                    className="w-full h-full object-cover"
                                    videoConstraints={{
                                        facingMode: "user",
                                        width: 480,
                                        height: 360
                                    }}
                                />
                                {verifying && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white">
                                        <Loader2 className="h-10 w-10 animate-spin" />
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="w-full max-w-[240px] space-y-4">
                                <Input
                                    type="password"
                                    className="text-center text-2xl tracking-widest"
                                    maxLength={4}
                                    placeholder="0000"
                                    value={pinInput}
                                    onChange={(e) => setPinInput(e.target.value)}
                                />
                            </div>
                        )}

                        <div className="flex flex-col gap-2 w-full max-w-[320px] mt-4">
                            {authMethod === 'FACE' ? (
                                <div className="space-y-2">
                                    <Button size="lg" className="w-full" onClick={captureAndVerify} disabled={verifying}>
                                        {verifying ? 'Verifying...' : 'Verify Face'}
                                    </Button>
                                    <Button variant="ghost" className="w-full" onClick={() => setAuthMethod('PIN')}>
                                        Use PIN instead
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <Button size="lg" className="w-full" onClick={handlePinSubmit} disabled={verifying}>
                                        {verifying ? 'Verifying...' : 'Submit PIN'}
                                    </Button>
                                    <Button variant="ghost" className="w-full" onClick={() => setAuthMethod('FACE')}>
                                        Return to Face Scan
                                    </Button>
                                </div>
                            )}
                        </div>

                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
