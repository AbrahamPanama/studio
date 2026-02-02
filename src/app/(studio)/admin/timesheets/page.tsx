
'use client';

import React, { useMemo, useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, where, Timestamp, addDoc, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { TimeEntry } from '@/lib/types-timekeeper';
import { processTimeEntries, getPayPeriod, type DailyShift } from '@/lib/timekeeping-utils';
import { format, isSameDay, setHours, setMinutes } from 'date-fns';
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from '@/components/ui/card';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, AlertCircle, CheckCircle2, User, Pencil, StopCircle, Loader2, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useLanguage } from '@/contexts/language-context';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';


export default function TimesheetsPage() {
  const firestore = useFirestore();
  const { t } = useLanguage();
  const { toast } = useToast();

  const [fixingShift, setFixingShift] = useState<{ empId: string, date: Date, name: string } | null>(null);
  const [fixTime, setFixTime] = useState('17:00');
  const [isSubmittingFix, setIsSubmittingFix] = useState(false);
  
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [pinInput, setPinInput] = useState('');

  const [editingShift, setEditingShift] = useState<{
    inId: string, outId?: string,
    inTime: string, outTime: string, date: Date
  } | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  
  const [isAddingShift, setIsAddingShift] = useState(false);
  const [newShiftData, setNewShiftData] = useState({ 
      employeeId: '', date: format(new Date(), 'yyyy-MM-dd'), start: '08:00', end: '' 
  });


  // 1. Get Current Pay Period
  const payPeriod = useMemo(() => getPayPeriod(viewDate), [viewDate]);
  
  // 2. Query Data
  const logsQuery = useMemoFirebase(() => {
    if (!firestore || !isAuthorized) return null;
    return query(
        collection(firestore, 'time_entries'),
        where('timestamp', '>=', Timestamp.fromDate(payPeriod.start)),
        where('timestamp', '<=', Timestamp.fromDate(payPeriod.end)),
        orderBy('timestamp', 'desc')
    );
  }, [firestore, payPeriod, isAuthorized]);

  const { data: rawLogs, isLoading, error } = useCollection<TimeEntry>(logsQuery);

  // 3. Process Data
  const { summary, todaysLogs } = useMemo(() => {
    const safeLogs = rawLogs || [];
    const processed = processTimeEntries(safeLogs, payPeriod.start, payPeriod.end);
    const today = new Date();
    const todayActivity = safeLogs.filter(log => {
       const logDate = log.timestamp instanceof Date ? log.timestamp : (log.timestamp as any).toDate();
       return isSameDay(logDate, today);
    });
    return { summary: Object.values(processed), todaysLogs: todayActivity };
  }, [rawLogs, payPeriod]);

  const handlePrevPeriod = () => {
    const day = viewDate.getDate();
    // If in 2nd half (16+), go to 1st half (1). Else go to 2nd half of prev month (16)
    const newDate = day > 15 
        ? new Date(viewDate.getFullYear(), viewDate.getMonth(), 1)
        : new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 16);
    setViewDate(newDate);
  };

  const handleNextPeriod = () => {
      const day = viewDate.getDate();
      // If in 1st half (<=15), go to 2nd half (16). Else go to 1st half of next month (1)
      const newDate = day <= 15
          ? new Date(viewDate.getFullYear(), viewDate.getMonth(), 16)
          : new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
      setViewDate(newDate);
  };
  
  const handleFixSubmit = async () => {
    if (!fixingShift || !firestore) return;
    setIsSubmittingFix(true);
    try {
        const [hours, minutes] = fixTime.split(':').map(Number);
        const fixedDate = setMinutes(setHours(fixingShift.date, hours), minutes);
        await addDoc(collection(firestore, 'time_entries'), {
            employeeId: fixingShift.empId,
            employeeName: fixingShift.name,
            type: 'CLOCK_OUT',
            method: 'ADMIN',
            timestamp: Timestamp.fromDate(fixedDate),
        });
        toast({ title: "Success", description: "Missing punch has been corrected." });
        setFixingShift(null);
    } catch (e) {
        console.error("Failed to fix punch", e);
        toast({ title: "Error", description: "Could not save the correction.", variant: "destructive" });
    } finally {
        setIsSubmittingFix(false);
    }
  };

  const handleStopClock = async (empId: string, name: string) => {
    if (!firestore) return;
    try {
      await addDoc(collection(firestore, 'time_entries'), {
        employeeId: empId,
        employeeName: name,
        type: 'CLOCK_OUT',
        method: 'ADMIN',
        timestamp: Timestamp.now(),
      });
      toast({ title: "Success", description: `${name} has been clocked out.` });
    } catch (e) {
      console.error("Failed to stop clock", e);
      toast({ title: "Error", description: "Could not clock out the employee.", variant: "destructive" });
    }
  };
  
  const handleEditSubmit = async () => {
      if (!editingShift || !firestore) return;
      setIsSubmittingEdit(true);
      try {
          const batch = writeBatch(firestore);

          const [startHours, startMinutes] = editingShift.inTime.split(':').map(Number);
          const newStartDate = setMinutes(setHours(editingShift.date, startHours), startMinutes);
          const inRef = doc(firestore, 'time_entries', editingShift.inId);
          batch.update(inRef, { timestamp: Timestamp.fromDate(newStartDate) });

          if (editingShift.outId && editingShift.outTime) {
              const [endHours, endMinutes] = editingShift.outTime.split(':').map(Number);
              const newEndDate = setMinutes(setHours(editingShift.date, endHours), endMinutes);
              const outRef = doc(firestore, 'time_entries', editingShift.outId);
              batch.update(outRef, { timestamp: Timestamp.fromDate(newEndDate) });
          }
          await batch.commit();
          toast({ title: "Shift Updated", description: "The shift times have been saved." });
          setEditingShift(null);
      } catch (e) {
          console.error("Failed to edit shift", e);
          toast({ title: "Error", description: "Could not update the shift.", variant: "destructive" });
      } finally {
          setIsSubmittingEdit(false);
      }
  };

  const handleDeleteShift = async (shift: any) => {
    if(!firestore) return;
    if(!confirm("Are you sure you want to delete this shift?")) return;
    
    const batch = writeBatch(firestore);
    const inRef = doc(firestore, 'time_entries', shift.inId);
    batch.update(inRef, { isDeleted: true });
    
    if (shift.outId) {
        const outRef = doc(firestore, 'time_entries', shift.outId);
        batch.update(outRef, { isDeleted: true });
    }
    
    await batch.commit();
    setEditingShift(null);
    toast({ title: "Shift Deleted" });
  };

  const handleAddShift = async () => {
    if(!firestore || !newShiftData.employeeId) return;
    
    const baseDate = new Date(newShiftData.date + 'T00:00:00');
    const [h1, m1] = newShiftData.start.split(':').map(Number);
    const startTs = setMinutes(setHours(baseDate, h1), m1);
    
    const empName = summary.find(e => e.employeeId === newShiftData.employeeId)?.employeeName || 'Unknown';

    const batch = writeBatch(firestore);
    
    const inRef = doc(collection(firestore, 'time_entries'));
    batch.set(inRef, {
        employeeId: newShiftData.employeeId,
        employeeName: empName,
        type: 'CLOCK_IN',
        method: 'ADMIN',
        timestamp: Timestamp.fromDate(startTs)
    });

    if(newShiftData.end) {
          const [h2, m2] = newShiftData.end.split(':').map(Number);
          const endTs = setMinutes(setHours(baseDate, h2), m2);
          const outRef = doc(collection(firestore, 'time_entries'));
          batch.set(outRef, {
            employeeId: newShiftData.employeeId,
            employeeName: empName,
            type: 'CLOCK_OUT',
            method: 'ADMIN',
            timestamp: Timestamp.fromDate(endTs)
        });
    }
    
    await batch.commit();
    setIsAddingShift(false);
    toast({ title: "Shift Created" });
  };

  if (!isAuthorized) {
    return (
        <div className="flex h-[80vh] items-center justify-center">
            <Card className="w-full max-w-sm shadow-lg">
                <CardHeader>
                    <CardTitle className="text-center">Restricted Access</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Input 
                        type="password" 
                        placeholder="Enter Admin PIN" 
                        className="text-center text-lg tracking-widest"
                        value={pinInput}
                        onChange={(e) => setPinInput(e.target.value)}
                    />
                    <Button 
                        className="w-full" 
                        onClick={() => {
                            if (pinInput === '2831') {
                                setIsAuthorized(true);
                                toast({ title: "Access Granted" });
                            } else {
                                toast({ title: "Incorrect PIN", variant: "destructive" });
                                setPinInput('');
                            }
                        }}
                    >
                        Unlock Payroll
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
  }

  if (isLoading) return <div className="p-10">Loading Timesheets...</div>;
  if (error) return <div className="p-10 text-red-500">Error: {error.message}</div>;

  return (
    <>
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={handlePrevPeriod}>
                  <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-center">
                <h2 className="text-2xl font-bold tracking-tight">Payroll: {payPeriod.label}</h2>
                <p className="text-muted-foreground text-sm">
                  {format(payPeriod.start, 'MMM d')} - {format(payPeriod.end, 'MMM d, yyyy')}
                </p>
              </div>
              <Button variant="outline" size="icon" onClick={handleNextPeriod}>
                  <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setViewDate(new Date())}>
                  Today
              </Button>
              <Button onClick={() => setIsAddingShift(true)}><Plus className="mr-2 h-4 w-4"/> Add Shift</Button>
          </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours (Period)</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.reduce((acc, curr) => acc + curr.totalHours, 0).toFixed(1)} h
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
            <User className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.filter(s => s.shifts.some(shift => shift.status === 'ACTIVE')).length}
            </div>
            <p className="text-xs text-muted-foreground">Currently clocked in</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Missing Punches</CardTitle>
             <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
               {summary.reduce((acc, curr) => acc + curr.missingPunches, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="payroll" className="space-y-4">
        <TabsList>
          <TabsTrigger value="payroll">Payroll Summary</TabsTrigger>
          <TabsTrigger value="today">Today's Live Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="payroll" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Period Summary ({payPeriod.label})</CardTitle>
              <CardDescription>Total billable hours per employee.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead className="text-center">Shifts Worked</TableHead>
                    <TableHead className="text-center">Missing Punches</TableHead>
                    <TableHead className="text-right">Total Hours</TableHead>
                    <TableHead className="text-right">Est. Cost ($4.50/hr)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.map((emp) => (
                    <TableRow key={emp.employeeId}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                            <span>{emp.employeeName}</span>
                            <span className="text-xs text-slate-400">ID: {emp.employeeId.slice(0,6)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{emp.shifts.length}</TableCell>
                      <TableCell className="text-center">
                         {emp.missingPunches > 0 ? (
                           <Badge variant="destructive">{emp.missingPunches} Issues</Badge>
                         ) : (
                           <span className="text-slate-300">-</span>
                         )}
                      </TableCell>
                      <TableCell className="text-right font-bold text-lg">{emp.totalHours}</TableCell>
                      <TableCell className="text-right text-slate-500">
                         ${(emp.totalHours * 4.50).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {summary.length === 0 && (
                      <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                              No records found for this period.
                          </TableCell>
                      </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          
          <div className="grid gap-4 md:grid-cols-2">
             {summary.map(emp => (
                 <Card key={emp.employeeId} className="overflow-hidden">
                     <CardHeader className="bg-slate-50 pb-3">
                         <div className="flex justify-between items-center">
                             <CardTitle className="text-base">{emp.employeeName}</CardTitle>
                             <Badge variant="outline">{emp.totalHours} hrs</Badge>
                         </div>
                     </CardHeader>
                     <CardContent className="p-0">
                         <Table>
                             <TableHeader>
                                 <TableRow>
                                     <TableHead className="w-[100px]">Date</TableHead>
                                     <TableHead>In</TableHead>
                                     <TableHead>Out</TableHead>
                                     <TableHead className="text-right">Duration</TableHead>
                                     <TableHead className="text-right">Actions</TableHead>
                                 </TableRow>
                             </TableHeader>
                             <TableBody>
                                 {emp.shifts.map((shift, idx) => (
                                     <TableRow key={idx}>
                                         <TableCell className="text-xs">{format(shift.date, 'MMM d')}</TableCell>
                                         <TableCell className="text-xs font-mono">{format(shift.clockIn, 'h:mm a')}</TableCell>
                                         <TableCell className="text-xs font-mono">
                                            {shift.clockOut ? format(shift.clockOut, 'h:mm a') : (
                                              <div className="flex items-center gap-2">
                                                <span className="text-green-600 font-bold">Active</span>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => handleStopClock(emp.employeeId, emp.employeeName)}>
                                                  <StopCircle className="h-4 w-4" />
                                                </Button>
                                              </div>
                                            )}
                                            {shift.status === 'MISSING_OUT' && (
                                                <Button 
                                                  variant="outline" 
                                                  size="sm" 
                                                  className="text-red-600 border-red-200 bg-red-50 hover:bg-red-100 h-6 text-xs"
                                                  onClick={() => setFixingShift({ empId: emp.employeeId, name: emp.employeeName, date: shift.clockIn })}
                                                >
                                                  Fix Missing Out
                                                </Button>
                                            )}
                                         </TableCell>
                                         <TableCell className="text-right text-xs">
                                             {shift.durationMinutes > 0 ? `${(shift.durationMinutes / 60).toFixed(1)}h` : '-'}
                                         </TableCell>
                                         <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingShift({
                                                inId: shift.clockInId,
                                                outId: shift.clockOutId,
                                                date: shift.date,
                                                inTime: format(shift.clockIn, "HH:mm"),
                                                outTime: shift.clockOut ? format(shift.clockOut, "HH:mm") : ''
                                            })}>
                                                <Pencil className="h-3 w-3 text-slate-500" />
                                            </Button>
                                         </TableCell>
                                     </TableRow>
                                 ))}
                             </TableBody>
                         </Table>
                     </CardContent>
                 </Card>
             ))}
          </div>
        </TabsContent>

        <TabsContent value="today">
          <Card>
            <CardHeader>
              <CardTitle>Today's Activity ({format(new Date(), 'EEEE, MMM do')})</CardTitle>
              <CardDescription>Real-time log of all punches.</CardDescription>
            </CardHeader>
            <CardContent>
               <Table>
                   <TableHeader>
                       <TableRow>
                           <TableHead>Time</TableHead>
                           <TableHead>Employee</TableHead>
                           <TableHead>Action</TableHead>
                           <TableHead>Method</TableHead>
                           <TableHead>Photo</TableHead>
                       </TableRow>
                   </TableHeader>
                   <TableBody>
                       {todaysLogs.map(log => {
                           const time = log.timestamp instanceof Date ? log.timestamp : (log.timestamp as any).toDate();
                           return (
                               <TableRow key={log.id}>
                                   <TableCell className="font-mono">{format(time, 'h:mm:ss a')}</TableCell>
                                   <TableCell className="font-medium">{log.employeeName}</TableCell>
                                   <TableCell>
                                       {log.type === 'CLOCK_IN' ? <Badge className="bg-green-600">IN</Badge> : <Badge variant="secondary">OUT</Badge>}
                                   </TableCell>
                                   <TableCell className="text-xs text-muted-foreground">{log.method}</TableCell>
                                   <TableCell>
                                       {log.snapshotUrl ? (<a href={log.snapshotUrl} target="_blank" className="text-blue-500 text-xs hover:underline">View Photo</a>) : '-'}
                                   </TableCell>
                               </TableRow>
                           );
                       })}
                       {todaysLogs.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                                    No activity recorded today.
                                </TableCell>
                            </TableRow>
                       )}
                   </TableBody>
               </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>

    <Dialog open={!!fixingShift} onOpenChange={(isOpen) => !isOpen && setFixingShift(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Fix Missing Clock-Out</DialogTitle>
                <DialogDescription>
                    You are manually adding a clock-out for <span className="font-bold">{fixingShift?.name}</span> on <span className="font-bold">{fixingShift?.date.toLocaleDateString()}</span>.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="fix-time" className="text-right">Clock-Out Time</Label>
                    <Input id="fix-time" type="time" value={fixTime} onChange={(e) => setFixTime(e.target.value)} className="col-span-3"/>
                </div>
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setFixingShift(null)}>Cancel</Button>
                <Button type="submit" onClick={handleFixSubmit} disabled={isSubmittingFix}>{isSubmittingFix ? "Saving..." : "Save Correction"}</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    <Dialog open={!!editingShift} onOpenChange={(isOpen) => !isOpen && setEditingShift(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Edit Shift</DialogTitle>
                <DialogDescription>Manually adjust the start and end time for this shift.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-start-time" className="text-right">Start Time</Label>
                    <Input id="edit-start-time" type="time" value={editingShift?.inTime || ''} 
                        onChange={(e) => setEditingShift(s => s ? {...s, inTime: e.target.value} : null)}
                        className="col-span-3"/>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-end-time" className="text-right">End Time</Label>
                    <Input id="edit-end-time" type="time" value={editingShift?.outTime || ''}
                        onChange={(e) => setEditingShift(s => s ? {...s, outTime: e.target.value} : null)}
                        disabled={!editingShift?.outId}
                        className="col-span-3"/>
                </div>
            </div>
            <DialogFooter className="justify-between">
                <Button variant="destructive" onClick={() => editingShift && handleDeleteShift(editingShift)}>
                    <Trash2 className="h-4 w-4 mr-2"/> Delete
                </Button>
                <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setEditingShift(null)}>Cancel</Button>
                    <Button type="submit" onClick={handleEditSubmit} disabled={isSubmittingEdit}>
                        {isSubmittingEdit ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save Changes"}
                    </Button>
                </div>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    <Dialog open={isAddingShift} onOpenChange={setIsAddingShift}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Add Manual Shift</DialogTitle>
                <DialogDescription>Manually create a clock-in and optional clock-out entry.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="new-employee" className="text-right">Employee</Label>
                    <Select onValueChange={(val) => setNewShiftData(d => ({...d, employeeId: val}))}>
                        <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Select an employee" />
                        </SelectTrigger>
                        <SelectContent>
                            {summary.map(emp => (
                                <SelectItem key={emp.employeeId} value={emp.employeeId}>{emp.employeeName}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="new-date" className="text-right">Date</Label>
                    <Input id="new-date" type="date" value={newShiftData.date} onChange={(e) => setNewShiftData(d => ({...d, date: e.target.value}))} className="col-span-3"/>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="new-start" className="text-right">Start Time</Label>
                    <Input id="new-start" type="time" value={newShiftData.start} onChange={(e) => setNewShiftData(d => ({...d, start: e.target.value}))} className="col-span-3"/>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="new-end" className="text-right">End Time</Label>
                    <Input id="new-end" type="time" value={newShiftData.end} onChange={(e) => setNewShiftData(d => ({...d, end: e.target.value}))} className="col-span-3"/>
                </div>
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddingShift(false)}>Cancel</Button>
                <Button type="submit" onClick={handleAddShift}>Create Shift</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}
