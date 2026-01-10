
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Plus, Trash2, Search, DollarSign, Calculator } from 'lucide-react';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogTrigger,
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
    FormDescription,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

import { useResourcesService } from '@/services/resources';
import { useProductionLogsService } from '@/services/production-logs';
import { productionLogSchema, UNITS } from '@/lib/schema-production';
import type { Order, ResourceItem, ProductionLog } from '@/lib/types';
import { formatCurrency } from '@/lib/utils'; // Assuming utils exists

interface ProductionTabProps {
    order: Order;
}

export function ProductionTab({ order }: ProductionTabProps) {
    const [logs, setLogs] = useState<ProductionLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const { getByOrder, remove } = useProductionLogsService();

    const loadLogs = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getByOrder(order.id);
            setLogs(data);
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to load production logs.',
            });
        } finally {
            setIsLoading(false);
        }
    }, [order.id, toast, getByOrder]);

    useEffect(() => {
        loadLogs();
    }, [loadLogs]);

    const handleDelete = async (logId: string) => {
        if (!confirm('Remove this item from the production log?')) return;
        try {
            await remove(order.id, logId);
            toast({ title: 'Success', description: 'Item removed.' });
            loadLogs();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to remove item.' });
        }
    };

    // Financials
    const totalProductionCost = useMemo(() => logs.reduce((acc, log) => acc + log.totalCost, 0), [logs]);
    const quotedPrice = order.orderTotal;
    const margin = quotedPrice - totalProductionCost;
    const marginPercent = quotedPrice > 0 ? (margin / quotedPrice) * 100 : 0;

    return (
        <div className="space-y-6">

            {/* 1. Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="py-4">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Quoted Price (Total)</CardTitle>
                        <div className="text-2xl font-bold">{formatCurrency(quotedPrice)}</div>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="py-4">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Production Cost</CardTitle>
                        <div className="text-2xl font-bold text-red-600">-{formatCurrency(totalProductionCost)}</div>
                    </CardHeader>
                </Card>
                <Card className={margin < 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}>
                    <CardHeader className="py-4">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Estimated Margin</CardTitle>
                        <div className={`text-2xl font-bold ${margin < 0 ? 'text-red-700' : 'text-green-700'}`}>
                            {formatCurrency(margin)}
                            <span className="text-sm font-normal ml-2 opacity-80">({marginPercent.toFixed(1)}%)</span>
                        </div>
                    </CardHeader>
                </Card>
            </div>

            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Bill of Materials (BOM) & Labor</h3>
                <AddProductionLogDialog order={order} onSuccess={loadLogs} />
            </div>

            {/* 2. Logs Table */}
            <div className="rounded-md border bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Resource</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Used For</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Rate</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={7} className="text-center py-6">Loading...</TableCell></TableRow>
                        ) : logs.length === 0 ? (
                            <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No production logs yet. Add materials or labor used.</TableCell></TableRow>
                        ) : (
                            logs.map(log => {
                                const relatedProduct = order.productos.find(p => p.id === log.relatedProductId || (p as any)._id === log.relatedProductId); // Fallback for weak ID matching
                                return (
                                    <TableRow key={log.id}>
                                        <TableCell className="font-medium">
                                            {log.resourceName}
                                            {log.notes && <div className="text-xs text-muted-foreground">{log.notes}</div>}
                                        </TableCell>
                                        <TableCell>{log.resourceType}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {relatedProduct ? relatedProduct.name : (log.relatedProductId ? 'Unknown Product' : 'General Order')}
                                        </TableCell>
                                        <TableCell className="text-right">{log.quantityUsed} {log.unit}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(log.costPerUnit)}</TableCell>
                                        <TableCell className="text-right font-bold">{formatCurrency(log.totalCost)}</TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(log.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}


/* --- Add Dialog Component --- */

interface AddProductionLogDialogProps {
    order: Order;
    onSuccess: () => void;
}

function AddProductionLogDialog({ order, onSuccess }: AddProductionLogDialogProps) {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<'picker' | 'details'>('picker');
    const [selectedResource, setSelectedResource] = useState<ResourceItem | null>(null);
    const [resources, setResources] = useState<ResourceItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoadingResources, setIsLoadingResources] = useState(false);
    const { toast } = useToast();
    const { getAll } = useResourcesService();

    // Load resources when picker opens
    useEffect(() => {
        if (open && step === 'picker') {
            const fetchResources = async () => {
                setIsLoadingResources(true);
                try {
                    const data = await getAll();
                    setResources(data);
                } catch (e) {
                    console.error(e);
                } finally {
                    setIsLoadingResources(false);
                }
            };
            fetchResources();
        }
    }, [open, step, getAll]);

    const handleResourceSelect = (resource: ResourceItem) => {
        setSelectedResource(resource);
        setStep('details');
    };

    const handleClose = () => {
        setOpen(false);
        setStep('picker');
        setSelectedResource(null);
        setSearchTerm('');
    };

    const filteredResources = resources.filter(r =>
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.type.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> Add Material/Labor
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>{step === 'picker' ? 'Select Resource' : 'Add Production Log'}</DialogTitle>
                    <DialogDescription>
                        {step === 'picker'
                            ? 'Choose a material or labor type from the library.'
                            : `Logging usage for: ${selectedResource?.name}`
                        }
                    </DialogDescription>
                </DialogHeader>

                {step === 'picker' ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Search className="h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search resources..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <ScrollArea className="h-[300px] border rounded-md p-2">
                            {isLoadingResources ? (
                                <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
                            ) : filteredResources.length === 0 ? (
                                <div className="text-center p-4 text-muted-foreground">No resources found.</div>
                            ) : (
                                <div className="space-y-1">
                                    {filteredResources.map(r => (
                                        <div
                                            key={r.id}
                                            className="flex justify-between items-center p-2 hover:bg-slate-100 rounded-md cursor-pointer transition-colors"
                                            onClick={() => handleResourceSelect(r)}
                                        >
                                            <div>
                                                <div className="font-medium">{r.name}</div>
                                                <div className="text-xs text-muted-foreground">{r.type} • {formatCurrency(r.defaultCostPerUnit)} / {r.defaultUnit}</div>
                                            </div>
                                            <Button variant="ghost" size="sm">Select</Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                        <DialogFooter>
                            <div className="text-xs text-muted-foreground pt-2">
                                Tip: Go to "Manage Resources" to add new items.
                            </div>
                        </DialogFooter>
                    </div>
                ) : (
                    <LogDetailsForm
                        resource={selectedResource!}
                        order={order}
                        onBack={() => setStep('picker')}
                        onSuccess={() => {
                            onSuccess();
                            handleClose();
                        }}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}

// Log Details Form using React Hook Form
function LogDetailsForm({
    resource,
    order,
    onBack,
    onSuccess
}: {
    resource: ResourceItem,
    order: Order,
    onBack: () => void,
    onSuccess: () => void
}) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const { add } = useProductionLogsService();

    // Prepare default values
    const form = useForm<z.infer<typeof productionLogSchema>>({
        resolver: zodResolver(productionLogSchema),
        defaultValues: {
            orderId: order.id,
            resourceName: resource.name,
            resourceType: resource.type,
            quantityUsed: 1,
            unit: resource.defaultUnit,
            costPerUnit: resource.defaultCostPerUnit,
            totalCost: resource.defaultCostPerUnit, // initial calc
            relatedProductId: 'general', // or empty string
            notes: '',
            dateAdded: new Date(),
        }
    });

    // Auto-calc total cost when qty or cost changes
    const qty = form.watch('quantityUsed');
    const cost = form.watch('costPerUnit');
    const unit = form.watch('unit');

    useEffect(() => {
        const total = (Number(qty) || 0) * (Number(cost) || 0);
        form.setValue('totalCost', total);
        form.setValue('unit', unit);
    }, [qty, cost, unit, form]);

    const onSubmit = async (data: z.infer<typeof productionLogSchema>) => {
        setIsSubmitting(true);
        try {
            // If "general" was selected, clear it or keep it as null/undefined depending on schema
            const payload = {
                ...data,
                relatedProductId: data.relatedProductId === 'general' ? undefined : data.relatedProductId
            };

            await add(order.id, payload);
            toast({ title: 'Success', description: 'Log added.' });
            onSuccess();
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to add log.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                {/* Product Link */}
                <FormField control={form.control} name="relatedProductId" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Used For (Product)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select product" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="general">General (Entire Order)</SelectItem>
                                {order.productos.map((p, idx) => (
                                    <SelectItem key={p.id || `temp-${idx}`} value={p.id || 'unknown'}>
                                        {p.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="quantityUsed" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Quantity ({resource.defaultUnit})</FormLabel>
                            <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="costPerUnit" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Rate ($)</FormLabel>
                            <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                            <FormDescription>Snapshot cost</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>

                <div className="flex justify-between items-center bg-slate-100 p-2 rounded text-sm font-semibold">
                    <span>Total Cost:</span>
                    <span>{formatCurrency(form.watch('totalCost'))}</span>
                </div>

                <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl><Input placeholder="e.g. Scraps, Laser settings" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button type="button" variant="ghost" onClick={onBack}>Back</Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Add to Log
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    );
}
