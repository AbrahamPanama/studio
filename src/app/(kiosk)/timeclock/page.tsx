'use client';

import { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, query, where, addDoc, Timestamp, getDocs, orderBy, limit } from 'firebase/firestore';
import { firestore, storage } from '@/firebase';
import { Employee } from '@/lib/types-timekeeper';
import { verifyEmployeeFace } from '../actions';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Clock, LogOut, LogIn } from 'lucide-react';
import Webcam from 'react-webcam';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { differenceInHours, differenceInMinutes } from 'date-fns';

type EmployeeStatus = {
    isClockedIn: boolean;
    lastPunchTime: Date | null;
    durationLabel: string | null;
};

export default function TimeclockPage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    
    // Smart Status State
    const [status, setStatus] = useState<EmployeeStatus>({ isClockedIn: false, lastPunchTime: null, durationLabel: null });
    const [isLoadingStatus, setIsLoadingStatus] = useState(false);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [authMethod, setAuthMethod] = useState<'FACE' | 'PIN'>('FACE');
    const [pinInput, setPinInput] = useState('');
    const webcamRef = useRef<Webcam>(null);
    const { toast } = useToast();

    // 1. Load Active Employees
    useEffect(() => {
        const q = query(collection(firestore, 'employees'), where('isActive', '==', true));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Employee[];
            setEmployees(data);
        });
        return () => unsubscribe();
    }, []);

    // 2. Smart Status Check (Runs when card is clicked)
    const handleCardClick = async (emp: Employee) => {
        setSelectedEmployee(emp);
        setIsLoadingStatus(true);
        setIsDialogOpen(true); // Open immediately
        setAuthMethod('FACE');
        setPinInput('');

        try {
            // Fetch the very last log for this user
            const logsRef = collection(firestore, 'time_entries');
            // Note: This requires a composite index. If it fails, we fall back to client-side sort
            const q = query(
                logsRef, 
                where('employeeId', '==', emp.id), 
                orderBy('timestamp', 'desc'), 
                limit(1)
            );
            
            const snapshot = await getDocs(q);
            
            if (!snapshot.empty) {
                const lastLog = snapshot.docs[0].data();
                const isClockedIn = lastLog.type === 'CLOCK_IN';
                const lastTime = lastLog.timestamp.toDate();
                
                let durationLabel = null;
                if (isClockedIn) {
                    const now = new Date();
                    const hours = differenceInHours(now, lastTime);
                    const minutes = differenceInMinutes(now, lastTime) % 60;
                    durationLabel = `${hours}h ${minutes}m`;
                }

                setStatus({ isClockedIn, lastPunchTime: lastTime, durationLabel });
            } else {
                // No logs ever -> Assume Clocked OUT
                setStatus({ isClockedIn: false, lastPunchTime: null, durationLabel: null });
            }
        } catch (err) {
            console.error("Status fetch error (likely missing index):", err);
            // Fallback: Default to "Clock In" if we can't read DB
            setStatus({ isClockedIn: false, lastPunchTime: null, durationLabel: null });
        } finally {
            setIsLoadingStatus(false);
        }
    };

    const handleSuccess = async (method: 'FACE' | 'PIN', snapshotBase64?: string) => {
        if (!selectedEmployee) return;
        
        // AUTO-TOGGLE: If In -> Out, If Out -> In
        const type = status.isClockedIn ? 'CLOCK_OUT' : 'CLOCK_IN';
        
        await recordTimeEntry(selectedEmployee, type, method, snapshotBase64);
        
        const actionText = type === 'CLOCK_IN' ? 'Clocked IN' : 'Clocked OUT';
        toast({ 
            title: `Success: ${actionText}`, 
            description: type === 'CLOCK_OUT' ? `Shift duration: ${status.durationLabel}` : `Have a great shift!`,
            className: type === 'CLOCK_IN' ? "bg-green-600 text-white" : "bg-blue-600 text-white" 
        });
        
        setIsDialogOpen(false);
    };

    const captureAndVerify = async () => {
        if (!webcamRef.current || !selectedEmployee) return;
        const screenshot = webcamRef.current.getScreenshot();
        if (!screenshot) {
            toast({ title: "Camera Error", description: "Camera not ready.", variant: "destructive" });
            return;
        }

        setVerifying(true);
        try {
            const result = await verifyEmployeeFace(selectedEmployee.photoUrl, screenshot);
            if (result.isMatch) {
                await handleSuccess('FACE', screenshot);
            } else {
                toast({ title: "Face mismatch", description: "Try again or use PIN.", variant: "destructive" });
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Verification Error", variant: "destructive" });
        } finally {
            setVerifying(false);
        }
    };

    const handlePinSubmit = async () => {
        if (!selectedEmployee) return;
        if (pinInput === selectedEmployee.pin) {
            setVerifying(true);
            try {
                await handleSuccess('PIN');
            } catch (e) {
                toast({ title: "Error", variant: "destructive" });
            } finally {
                setVerifying(false);
            }
        } else {
            toast({ title: "Invalid PIN", variant: "destructive" });
            setPinInput('');
        }
    };

    const recordTimeEntry = async (employee: Employee, type: 'CLOCK_IN' | 'CLOCK_OUT', method: 'FACE' | 'PIN', snapshotBase64?: string) => {
        let snapshotUrl = null;
        if (snapshotBase64) {
            try {
                const snapshotRef = ref(storage, `time_snapshots/${employee.id}_${Date.now()}.jpg`);
                await uploadString(snapshotRef, snapshotBase64, 'data_url');
                snapshotUrl = await getDownloadURL(snapshotRef);
            } catch (e) { console.error("Upload failed", e); }
        }

        const payload: any = {
            employeeId: employee.id,
            employeeName: employee.name,
            type, // <--- DYNAMIC TYPE
            timestamp: Timestamp.now(),
            method,
        };
        if (snapshotUrl) payload.snapshotUrl = snapshotUrl;

        // Write to DB
        await addDoc(collection(firestore, 'time_entries'), payload);
    };

    // UI HELPER: Dynamic Header Color & Text
    const getHeaderContent = () => {
        if (isLoadingStatus) return { color: 'text-slate-500', text: 'Checking status...', sub: '' };
        
        if (status.isClockedIn) {
            return {
                color: 'text-red-600',
                text: 'Clocking OUT',
                sub: `You have been working for ${status.durationLabel}`,
                icon: <LogOut className="w-6 h-6 text-red-600 mb-2" />
            };
        } else {
            return {
                color: 'text-green-600',
                text: 'Clocking IN',
                sub: 'Ready to start your shift?',
                icon: <LogIn className="w-6 h-6 text-green-600 mb-2" />
            };
        }
    };

    const header = getHeaderContent();

    return (
        <div className="p-8 min-h-screen bg-slate-50">
            <h1 className="text-4xl font-bold text-center mb-12 text-slate-800">Timekeeper</h1>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {employees.map((emp) => (
                    <Card
                        key={emp.id}
                        className="cursor-pointer hover:shadow-xl transition-all border-2 border-transparent hover:border-blue-200 active:scale-95"
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
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-md border-0">
                    <DialogHeader className="flex flex-col items-center justify-center pb-2">
                        {header.icon}
                        <DialogTitle className={`text-3xl font-bold ${header.color}`}>
                            {header.text}
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 font-medium text-lg mt-1 text-center">
                            {header.sub}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col items-center space-y-6 py-4">
                        {/* CAMERA / PIN UI */}
                        {authMethod === 'FACE' ? (
                            <div className="relative rounded-xl overflow-hidden border-4 border-slate-100 shadow-inner bg-black aspect-[4/3] w-full max-w-[320px]">
                                <Webcam
                                    ref={webcamRef}
                                    screenshotFormat="image/jpeg"
                                    screenshotQuality={0.25}
                                    videoConstraints={{
                                        width: 960,
                                        height: 720,
                                        aspectRatio: 4 / 3
                                    }}
                                    className="w-full h-full object-cover"
                                    mirrored
                                />
                                {verifying && (
                                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white backdrop-blur-sm">
                                        <Loader2 className="h-12 w-12 animate-spin mb-2" />
                                        <span className="font-medium">Verifying Face...</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="w-full max-w-[240px] py-4">
                                <Input
                                    type="password"
                                    className="text-center text-4xl tracking-[1em] h-16 font-bold"
                                    maxLength={4}
                                    placeholder="••••"
                                    value={pinInput}
                                    onChange={(e) => setPinInput(e.target.value)}
                                />
                            </div>
                        )}

                        <div className="w-full max-w-[320px] space-y-3">
                            <Button 
                                size="lg" 
                                className={`w-full text-lg h-14 ${status.isClockedIn ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                                onClick={authMethod === 'FACE' ? captureAndVerify : handlePinSubmit} 
                                disabled={verifying || isLoadingStatus}
                            >
                                {verifying ? 'Verifying...' : (authMethod === 'FACE' ? 'Scan Face to Confirm' : 'Submit PIN')}
                            </Button>
                            
                            <Button variant="ghost" className="w-full text-slate-400" onClick={() => setAuthMethod(authMethod === 'FACE' ? 'PIN' : 'FACE')}>
                                Use {authMethod === 'FACE' ? 'PIN' : 'Face ID'} instead
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
