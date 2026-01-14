'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { firestore, storage } from '@/firebase';
import { Employee } from '@/lib/types-timekeeper';
import { employeeSchema } from '@/components/timekeeper/schemas';
import { ImageUpload } from '@/components/shared/image-upload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';

export default function EmployeesPage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    // Form State
    const [formData, setFormData] = useState<{
        id?: string;
        name: string;
        pin: string;
        photoUrl: string;
        isActive: boolean;
    }>({
        name: '',
        pin: '',
        photoUrl: '',
        isActive: true,
    });

    // Fetch Employees
    useEffect(() => {
        const q = query(collection(firestore, 'employees'), orderBy('name'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
                joinedAt: doc.data().joinedAt?.toDate(),
            })) as Employee[];
            setEmployees(data);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleImageUpload = async (file: File | null) => {
        if (!file) return;
        try {
            const storageRef = ref(storage, `employees/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const url = await getDownloadURL(snapshot.ref);
            setFormData((prev) => ({ ...prev, photoUrl: url }));
        } catch (error) {
            console.error("Upload failed", error);
            toast({ title: "Upload failed", variant: "destructive" });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // Validation
            const dataToValidate = { ...formData, joinedAt: new Date() };
            employeeSchema.parse(dataToValidate);

            if (formData.id) {
                // Edit
                await updateDoc(doc(firestore, 'employees', formData.id), {
                    name: formData.name,
                    pin: formData.pin,
                    photoUrl: formData.photoUrl,
                    isActive: formData.isActive,
                });
                toast({ title: "Employee updated" });
            } else {
                // Create
                await addDoc(collection(firestore, 'employees'), {
                    ...formData,
                    joinedAt: Timestamp.now(),
                });
                toast({ title: "Employee added" });
            }
            setIsDialogOpen(false);
            resetForm();
        } catch (error) {
            if (error instanceof z.ZodError) {
                toast({ title: "Validation Error", description: error.errors[0].message, variant: "destructive" });
            } else {
                console.error("Error saving employee", error);
                toast({ title: "Error saving employee", variant: "destructive" });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure?')) return;
        try {
            await deleteDoc(doc(firestore, 'employees', id));
            toast({ title: "Employee deleted" });
        } catch (error) {
            toast({ title: "Error deleting", variant: "destructive" });
        }
    };

    const openEdit = (emp: Employee) => {
        setFormData({
            id: emp.id,
            name: emp.name,
            pin: emp.pin,
            photoUrl: emp.photoUrl,
            isActive: emp.isActive,
        });
        setIsDialogOpen(true);
    };

    const resetForm = () => {
        setFormData({ name: '', pin: '', photoUrl: '', isActive: true });
    };

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Employees</h1>
                    <p className="text-muted-foreground mt-2">Manage your team and their biometric data.</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
                    <DialogTrigger asChild>
                        <Button size="lg" className="gap-2">
                            <Plus className="h-5 w-5" /> Add Employee
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>{formData.id ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Reference Photo (Required for AI)</label>
                                <ImageUpload
                                    value={formData.photoUrl}
                                    onChange={handleImageUpload}
                                    onClear={() => setFormData({ ...formData, photoUrl: '' })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Full Name</label>
                                    <Input
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">4-Digit PIN</label>
                                    <Input
                                        value={formData.pin}
                                        onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                                        placeholder="1234"
                                        maxLength={4}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    className="h-4 w-4 rounded border-gray-300"
                                />
                                <label htmlFor="isActive" className="text-sm font-medium">Active Status</label>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Save Employee
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="border rounded-md bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50">
                            <TableHead className="w-[80px]">Photo</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>PIN</TableHead>
                            <TableHead>Joined</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">Loading...</TableCell>
                            </TableRow>
                        ) : employees.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">No employees found.</TableCell>
                            </TableRow>
                        ) : (
                            employees.map((emp) => (
                                <TableRow key={emp.id}>
                                    <TableCell>
                                        <div className="h-10 w-10 rounded-full overflow-hidden bg-slate-100 relative">
                                            {emp.photoUrl ? (
                                                <img src={emp.photoUrl} alt={emp.name} className="h-full w-full object-cover" />
                                            ) : (
                                                <div className="h-full w-full flex items-center justify-center text-xs text-slate-400">?</div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium">{emp.name}</TableCell>
                                    <TableCell className="font-mono text-muted-foreground">****</TableCell>
                                    <TableCell>{emp.joinedAt?.toLocaleDateString()}</TableCell>
                                    <TableCell>
                                        <Badge variant={emp.isActive ? 'default' : 'secondary'}>
                                            {emp.isActive ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button variant="ghost" size="icon" onClick={() => openEdit(emp)}>
                                            <Pencil className="h-4 w-4 text-slate-500" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(emp.id)}>
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
