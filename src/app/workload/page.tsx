'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { 
  format, 
  startOfDay, 
  addDays, 
  differenceInDays, 
  isSunday,
  isSameDay
} from 'date-fns';
import { 
  Flame, 
  AlertTriangle, 
  Clock,
  ExternalLink,
  CheckCircle2,
  CalendarDays,
  Filter,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import type { Order } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type UrgencyLevel = 'CRITICAL' | 'WARNING' | 'NORMAL';

interface WorkloadItem extends Order {
  daysUntilDue: number;
  urgency: UrgencyLevel;
  complexityBuffer: number;
  targetDate: Date;
}

// ----------------------------------------------------------------------
// LOGIC
// ----------------------------------------------------------------------

function getWorkloadData(
  orders: Order[] = [], 
  includeSundays: boolean, 
  horizonDays: number,
  selectedDate: string | null
) {
  const now = startOfDay(new Date());
  
  // 1. Base Filter: Active Orders Only
  const activeOrders = orders.filter(o => o.estado !== 'Cotización' && o.estado !== 'Done');

  // Helper to parse dates safely
  const getTargetDate = (order: Order) => {
    const rawDate = order.entregaLimite || order.entrega;
    if (rawDate && typeof (rawDate as any).toDate === 'function') return (rawDate as any).toDate();
    if (rawDate instanceof Date) return rawDate;
    if (typeof rawDate === 'string') return new Date(rawDate);
    return null;
  };

  // ------------------------------------------------
  // PASS 1: Build Horizon (Global View)
  // ------------------------------------------------
  const dailyVolume = new Map<string, { total: number, high: number, medium: number, low: number }>();

  // Initialize Horizon Keys
  for (let i = 0; i < horizonDays; i++) {
    dailyVolume.set(format(addDays(now, i), 'yyyy-MM-dd'), { total: 0, high: 0, medium: 0, low: 0 });
  }

  // Pre-process all orders to categorize them and populate horizon
  const preparedOrders = activeOrders.map(order => {
    const targetDate = getTargetDate(order);
    if (!targetDate || isNaN(targetDate.getTime())) return null;

    // Sunday Check
    if (!includeSundays && isSunday(targetDate)) return null;

    // Complexity Logic
    const amount = order.orderTotal || 0;
    let complexity: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    if (amount >= 500) complexity = 'HIGH';
    else if (amount >= 150) complexity = 'MEDIUM';

    // Update Horizon Map
    const key = format(startOfDay(targetDate), 'yyyy-MM-dd');
    if (dailyVolume.has(key)) {
      const entry = dailyVolume.get(key)!;
      entry.total += 1;
      if (complexity === 'HIGH') entry.high += 1;
      else if (complexity === 'MEDIUM') entry.medium += 1;
      else entry.low += 1;
    }

    return { order, targetDate, complexity, amount };
  }).filter((o): o is NonNullable<typeof o> => o !== null);


  // ------------------------------------------------
  // PASS 2: Build View (Filtered View)
  // ------------------------------------------------
  const viewOrders = selectedDate 
    ? preparedOrders.filter(o => format(startOfDay(o.targetDate), 'yyyy-MM-dd') === selectedDate)
    : preparedOrders;

  const processed: WorkloadItem[] = [];

  viewOrders.forEach(({ order, targetDate, amount }) => {
    const dayStart = startOfDay(targetDate);
    const daysUntilDue = differenceInDays(dayStart, now);
    
    // Safety Buffer Calculation
    const complexityDays = Math.floor(amount / 100); 
    const safeBuffer = 2 + complexityDays;

    let urgency: UrgencyLevel = 'NORMAL';
    if (daysUntilDue <= 0) urgency = 'CRITICAL';
    else if (daysUntilDue <= safeBuffer) urgency = 'WARNING';

    processed.push({
      ...order,
      daysUntilDue,
      urgency,
      complexityBuffer: safeBuffer,
      targetDate
    });
  });

  // Sort Priority Queue
  const priorityQueue = processed
    .filter(o => o.urgency !== 'NORMAL')
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue);

  // View Stats
  const stats = {
    critical: processed.filter(o => o.urgency === 'CRITICAL').length,
    warning: processed.filter(o => o.urgency === 'WARNING').length,
    totalActive: processed.length,
    // Horizon Array (Always shows global context)
    horizon: Array.from(dailyVolume.entries()).map(([key, vol]) => {
      const d = new Date(key + 'T00:00:00');
      return { 
        day: format(d, 'EEE'), 
        date: format(d, 'dd'), 
        fullDate: key,
        ...vol
      };
    })
  };

  return { priorityQueue, stats };
}

// ----------------------------------------------------------------------
// COMPONENTS
// ----------------------------------------------------------------------

function UrgencyBadge({ level, days }: { level: UrgencyLevel, days: number }) {
  if (level === 'CRITICAL') {
    return (
      <Badge variant="destructive" className="flex items-center gap-1">
        <Flame className="h-3 w-3" />
        {days < 0 ? `${Math.abs(days)}d Overdue` : 'Due Today'}
      </Badge>
    );
  }
  if (level === 'WARNING') {
    return (
      <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-200 flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        Due in {days}d
      </Badge>
    );
  }
  return <Badge variant="outline" className="text-slate-500">Normal</Badge>;
}

export default function WorkloadPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  // State
  const [includeSundays, setIncludeSundays] = useState(false);
  const [horizonDays, setHorizonDays] = useState(7);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Queries
  const ordersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'orders'), orderBy('fechaIngreso', 'desc'));
  }, [firestore]);

  const { data: allOrders, isLoading, error } = useCollection<Order>(ordersQuery);

  // Computed Data
  const { priorityQueue, stats } = useMemo(() => 
    getWorkloadData(allOrders || [], includeSundays, horizonDays, selectedDate), 
  [allOrders, includeSundays, horizonDays, selectedDate]);

  // Handlers
  const copyPhoneNumber = (phone: string) => {
    let clean = phone.replace(/\D/g, '');
    if (clean.startsWith('507') && clean.length > 7) clean = clean.replace(/^507/, '');
    navigator.clipboard.writeText(clean);
    toast({ description: "Phone copied: " + clean });
  };

  const handleBarClick = (date: string) => {
    // Toggle: if clicking same date, clear filter
    if (selectedDate === date) setSelectedDate(null);
    else setSelectedDate(date);
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center text-slate-400">Loading Workload...</div>;
  if (error) return <div className="p-8 text-red-500">Error: {error.message}</div>;

  // Max value for chart scaling
  const maxDailyVolume = Math.max(...stats.horizon.map(d => d.total), 1);

  return (
    <div className="flex-1 space-y-8 p-8 pt-6 min-h-screen bg-slate-50/50">
      
      {/* Header & Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Production Workload</h2>
          <p className="text-muted-foreground text-lg">
            Operational health & priority queue 
            {selectedDate && <span className="text-indigo-600 font-medium ml-2">• Filtered by {selectedDate}</span>}
          </p>
        </div>
        
        {/* Controls Toolbar */}
        <div className="flex items-center gap-4 bg-white p-2 px-4 rounded-lg border border-slate-200 shadow-sm flex-wrap">
            {selectedDate && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedDate(null)} className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8">
                    <X className="h-4 w-4 mr-1" /> Clear Filter
                </Button>
            )}
            <div className="h-4 w-px bg-slate-200 hidden md:block" />
            <div className="flex items-center space-x-2">
                <Switch id="sunday-mode" checked={includeSundays} onCheckedChange={setIncludeSundays} />
                <Label htmlFor="sunday-mode" className="text-sm text-slate-600">Sundays</Label>
            </div>
            <div className="flex items-center space-x-2">
                <CalendarDays className="h-4 w-4 text-slate-400" />
                <Select value={horizonDays.toString()} onValueChange={(v) => setHorizonDays(parseInt(v))}>
                    <SelectTrigger className="w-[110px] h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="7">1 Week</SelectItem>
                        <SelectItem value="14">2 Weeks</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
      </div>

      {/* Row 1: The Pulse */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className={`border-l-4 ${stats.critical > 0 ? 'border-l-red-500 bg-red-50/30' : 'border-l-slate-200'}`}>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500 uppercase">Immediate Action</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-2">
                    <Flame className={`h-8 w-8 ${stats.critical > 0 ? 'text-red-500' : 'text-slate-300'}`} />
                    <div className="text-3xl font-bold text-slate-900">{stats.critical}</div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    {selectedDate ? 'Critical orders on this day' : 'Total orders overdue or due today'}
                </p>
            </CardContent>
        </Card>

        <Card className={`border-l-4 ${stats.warning > 0 ? 'border-l-amber-500 bg-amber-50/30' : 'border-l-slate-200'}`}>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500 uppercase">At Risk</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-2">
                    <AlertTriangle className={`h-8 w-8 ${stats.warning > 0 ? 'text-amber-500' : 'text-slate-300'}`} />
                    <div className="text-3xl font-bold text-slate-900">{stats.warning}</div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    {selectedDate ? 'Risk orders on this day' : 'Complex orders due soon'}
                </p>
            </CardContent>
        </Card>

        {/* COMPOSITE INTERACTIVE CHART */}
        <Card className="col-span-2">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-500 uppercase">{horizonDays}-Day Horizon</CardTitle>
                <div className="flex gap-2 text-[10px] text-slate-400">
                    <span className="flex items-center"><div className="w-2 h-2 bg-rose-400 rounded-full mr-1"/>High ($500+)</span>
                    <span className="flex items-center"><div className="w-2 h-2 bg-amber-400 rounded-full mr-1"/>Med</span>
                    <span className="flex items-center"><div className="w-2 h-2 bg-blue-400 rounded-full mr-1"/>Low</span>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex items-end justify-between gap-1 h-24 mt-2 overflow-x-auto pb-2">
                    {stats.horizon.map((day, i) => {
                        const isSelected = selectedDate === day.fullDate;
                        // Calculate relative height for the whole bar
                        const barHeightPercent = Math.max(15, (day.total / maxDailyVolume) * 100); 
                        
                        return (
                        <div 
                            key={i} 
                            onClick={() => handleBarClick(day.fullDate)}
                            className={`flex flex-col items-center gap-1 min-w-[35px] flex-1 cursor-pointer group transition-all rounded-md p-1 ${isSelected ? 'bg-indigo-50 ring-1 ring-indigo-200' : 'hover:bg-slate-50'}`}
                        >
                            <div className="relative w-full flex items-end justify-center h-16">
                                {/* Stacked Bar Container */}
                                <div 
                                    className={`w-full max-w-[24px] rounded-sm overflow-hidden flex flex-col-reverse transition-all opacity-90 group-hover:opacity-100 ${isSelected ? 'ring-2 ring-indigo-600 ring-offset-1' : ''}`}
                                    style={{ height: `${barHeightPercent}%` }}
                                >
                                    {/* Low Segment */}
                                    {day.low > 0 && <div style={{ flex: day.low }} className="bg-blue-400 w-full" />}
                                    {/* Med Segment */}
                                    {day.medium > 0 && <div style={{ flex: day.medium }} className="bg-amber-400 w-full" />}
                                    {/* High Segment */}
                                    {day.high > 0 && <div style={{ flex: day.high }} className="bg-rose-400 w-full" />}
                                    
                                    {/* Zero State */}
                                    {day.total === 0 && <div className="h-1 bg-slate-100 w-full" />}
                                </div>
                                
                                {day.total > 0 && (
                                    <span className={`absolute -top-5 text-[10px] font-bold ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`}>
                                        {day.total}
                                    </span>
                                )}
                            </div>
                            <div className="text-center">
                                <div className={`text-[9px] uppercase font-bold ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`}>{day.day}</div>
                                <div className={`text-[10px] font-medium ${isSelected ? 'text-indigo-700' : 'text-slate-700'}`}>{day.date}</div>
                            </div>
                        </div>
                    )})}
                </div>
            </CardContent>
        </Card>
      </div>

      {/* Row 2: Priority Queue */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                <Clock className="h-5 w-5 text-slate-500" />
                {selectedDate ? `Priority Queue (${selectedDate})` : 'Priority Queue (All)'}
            </h3>
        </div>

        {priorityQueue.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <CheckCircle2 className="h-10 w-10 text-emerald-400 mb-2" />
            <h3 className="text-lg font-medium text-slate-900">All caught up!</h3>
            <p className="text-slate-500">
                {selectedDate ? `No urgent orders for ${selectedDate}.` : 'No urgent orders requiring attention.'}
            </p>
          </div>
        ) : (
            <div className="rounded-md border border-slate-200 bg-white overflow-hidden shadow-sm">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead className="w-[100px]">Status</TableHead>
                            <TableHead>Order</TableHead>
                            <TableHead>Client</TableHead>
                            <TableHead>Products</TableHead>
                            <TableHead>Target Date</TableHead>
                            <TableHead>Value / Complexity</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {priorityQueue.map((order) => (
                            <TableRow key={order.id} className="hover:bg-slate-50/50">
                                <TableCell>
                                    <UrgencyBadge level={order.urgency} days={order.daysUntilDue} />
                                </TableCell>
                                <TableCell className="font-medium">
                                    <Link 
                                        href={`/?tab=active&query=${order.orderNumber}`} 
                                        className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 hover:underline"
                                    >
                                        {order.orderNumber}
                                        <ExternalLink className="h-3 w-3 opacity-50" />
                                    </Link>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-medium text-slate-900">{order.name}</span>
                                        <span className="text-xs text-slate-500">{order.companyName}</span>
                                        {order.celular && (
                                            <button 
                                                onClick={() => copyPhoneNumber(order.celular!)}
                                                className="text-xs text-slate-400 hover:text-indigo-600 hover:underline text-left mt-0.5 w-fit flex items-center gap-1"
                                                title="Click to copy sanitized number"
                                            >
                                                {order.celular}
                                            </button>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="max-w-[250px]">
                                    <div className="flex flex-col gap-1">
                                        {order.productos?.map((p, idx) => (
                                            <div key={idx} className="text-xs text-slate-600 leading-tight">
                                                <span className="font-medium text-slate-900">• {p.name}</span>
                                                {(p as any).description && <span className="text-slate-400"> - {(p as any).description}</span>}
                                            </div>
                                        ))}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="text-sm text-slate-700">
                                            {format(order.targetDate, 'MMM dd')}
                                        </span>
                                        <span className="text-xs text-slate-400">
                                           {order.daysUntilDue === 0 ? 'Today' : order.daysUntilDue === 1 ? 'Tomorrow' : `In ${order.daysUntilDue} days`}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs">${(order.orderTotal || 0).toFixed(2)}</span>
                                        {order.complexityBuffer > 2 && (
                                            <Badge variant="secondary" className="text-[10px] h-5 px-1 bg-slate-100 text-slate-500">
                                                High Complexity
                                            </Badge>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button asChild size="sm" variant="ghost">
                                        <Link href={`/orders/${order.id}/edit`}>
                                            Edit
                                        </Link>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        )}
      </div>
    </div>
  );
}
