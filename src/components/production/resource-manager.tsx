
'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Plus, Trash2, Edit, Search } from 'lucide-react';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

import { useResourcesService } from '@/services/resources';
import { resourceItemSchema, RESOURCE_TYPES, UNITS } from '@/lib/schema-production';
import type { ResourceItem } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

type ResourceFormValues = z.infer<typeof resourceItemSchema>;

export function ResourceManager() {
    const [resources, setResources] = useState<ResourceItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingResource, setEditingResource] = useState<ResourceItem | null>(null);
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');

    const { getAll, add, update, remove } = useResourcesService();

    const loadResources = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getAll();
            setResources(data);
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to load resources.',
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast, getAll]);

    useEffect(() => {
        loadResources();
    }, [loadResources]);

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this resource?')) return;
        try {
            await remove(id);
            toast({ title: 'Success', description: 'Resource deleted.' });
            loadResources();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete resource.' });
        }
    };

    const handleEdit = (resource: ResourceItem) => {
        setEditingResource(resource);
        setIsDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setEditingResource(null);
        setIsDialogOpen(false);
    };

    const filteredResources = resources.filter(r =>
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.type.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Resource Library</h2>
                <Button onClick={() => setIsDialogOpen(true)} size="sm">
                    <Plus className="mr-2 h-4 w-4" /> Add Resource
                </Button>
            </div>

            <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search resources..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-xs h-8"
                />
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Unit</TableHead>
                            <TableHead className="text-right">Default Cost</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8">
                                    <div className="flex justify-center items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" /> Loading resources...
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredResources.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                    No resources found. Create one to get started.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredResources.map((resource) => (
                                <TableRow key={resource.id}>
                                    <TableCell className="font-medium">{resource.name}</TableCell>
                                    <TableCell>{resource.type}</TableCell>
                                    <TableCell>{resource.defaultUnit}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(resource.defaultCostPerUnit)}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(resource)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(resource.id)} className="text-destructive">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <ResourceDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onSuccess={loadResources}
                initialData={editingResource}
                onClose={handleCloseDialog}
            // Pass add/update functions to dialog if needed or keep them here.
            // But better to pass them or use hook inside Dialog. 
            // Using hook inside Dialog is better if we want to isolate. 
            // But for simplicity passing success callback is fine, but we also need the add/update function.
            // Actually, ResourceDialog can use the hook too or accept props.
            // Let's pass the service methods as props or just the hook actions to keep ResourceDialog dumb or smart.
            // I'll leave ResourceDialog smart enough to use the hook itself or pass in props.
            // The previous implementation used static service calls inside ResourceDialog.
            // I should update ResourceDialog to use the hook too.
            />
        </div>
    );
}

interface ResourceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    initialData: ResourceItem | null;
    onClose: () => void;
}

function ResourceDialog({ open, onOpenChange, onSuccess, initialData, onClose }: ResourceDialogProps) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { add, update } = useResourcesService();

    const form = useForm<ResourceFormValues>({
        resolver: zodResolver(resourceItemSchema),
        defaultValues: {
            name: '',
            type: 'Material',
            defaultUnit: 'Unit',
            defaultCostPerUnit: 0,
            stockQuantity: 0,
        },
    });

    useEffect(() => {
        if (open) {
            if (initialData) {
                form.reset({
                    ...initialData,
                });
            } else {
                form.reset({
                    name: '',
                    type: 'Material',
                    defaultUnit: 'Unit',
                    defaultCostPerUnit: 0,
                    stockQuantity: 0,
                });
            }
        }
    }, [open, initialData, form]);

    const onSubmit = async (data: ResourceFormValues) => {
        setIsSubmitting(true);
        try {
            if (initialData && initialData.id) {
                await update(initialData.id, data);
                toast({ title: 'Success', description: 'Resource updated.' });
            } else {
                await add(data);
                toast({ title: 'Success', description: 'Resource created.' });
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to save resource.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOpenChange = (newOpen: boolean) => {
        onOpenChange(newOpen);
        if (!newOpen) {
            onClose(); // Clean up state when dialog assumes closed state
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{initialData ? 'Edit Resource' : 'Add Resource'}</DialogTitle>
                    <DialogDescription>
                        {initialData ? 'Update the resource details below.' : 'Add a new resource to your global library.'}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="name" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Name</FormLabel>
                                <FormControl><Input placeholder="E.g., Acrylic 3mm" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="type" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Type</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {RESOURCE_TYPES.map((t) => (
                                                <SelectItem key={t} value={t}>{t}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <FormField control={form.control} name="defaultUnit" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Unit</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select unit" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {UNITS.map((u) => (
                                                <SelectItem key={u} value={u}>{u}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>

                        <FormField control={form.control} name="defaultCostPerUnit" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Cost Per Unit ($)</FormLabel>
                                <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
