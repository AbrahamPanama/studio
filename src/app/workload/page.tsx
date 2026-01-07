'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { 
  format, 
  startOfDay, 
  addDays, 
  differenceInDays, 
  isSameDay, 
  isPast 
} from 'date-fns';
import { 
  Flame, 
  AlertTriangle, 
  Calendar, 
  ArrowRight, 
  CheckCircle2, 
  Clock,
  ExternalLink
} from 'lucide-react';

import type { Order } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useLanguage } from '@/contexts/language-context';

type UrgencyLevel = 'CRITICAL' | 'WARNING' | 'NORMAL';

interface WorkloadItem extends Order {
  daysUntilDue: number;
  urgency: UrgencyLevel;
  complexityBuffer: number;
}

function getWorkloadData(orders: Order[] = []) {
  const now = startOfDay(new Date());
  
  // Filter Active Only (Exclude Quotes & Done)
  const activeOrders = orders.filter(o => o.estado !== 'Cotización' && o.estado !== 'Done');

  const processed: WorkloadItem[] = [];
  const dailyVolume = new Map<string, number>();

  // Initialize next 7 days
  for (let i = 0; i < 7; i++) {
    dailyVolume.set(format(addDays(now, i), 'yyyy-MM-dd'), 0);
  }

  activeOrders.forEach(order => {
    let dateObj: Date | null = null;
    if (order.entrega && typeof (order.entrega as any).toDate === 'function') {
      dateObj = (order.entrega as any).toDate();
    } else if (order.entrega instanceof Date) {
      dateObj = order.entrega;
    } else if (typeof order.entrega === 'string') {
      dateObj = new Date(order.entrega);
    }

    if (!dateObj) return;

    const dayStart = startOfDay(dateObj);
    const daysUntilDue = differenceInDays(dayStart, now);
    
    // Dynamic Complexity Logic
    const amount = order.orderTotal || 0;
    const complexityDays = Math.floor(amount / 100); 
    const safeBuffer = 2 + complexityDays;

    let urgency: UrgencyLevel = 'NORMAL';

    if (daysUntilDue <= 0) {
      urgency = 'CRITICAL';
    } else if (daysUntilDue <= safeBuffer) {
      urgency = 'WARNING';
    }

    processed.push({
      ...order,
      daysUntilDue,
      urgency,
      complexityBuffer: safeBuffer
    });

    // Horizon Volume
    const key = format(dayStart, 'yyyy-MM-dd');
    if (dailyVolume.has(key)) {
      dailyVolume.set(key, dailyVolume.get(key)! + 1);
    }
  });

  // Sort: Critical first, then Warning, then by days remaining
  const priorityQueue = processed
    .filter(o => o.urgency !== 'NORMAL')
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue);

  const stats = {
    critical: processed.filter(o => o.urgency === 'CRITICAL').length,
    warning: processed.filter(o => o.urgency === 'WARNING').length,
    totalActive: processed.length,
    horizon: Array.from(dailyVolume.entries()).map(([key, count]) => {
      const d = new Date(key + 'T00:00:00');
      return { 
        day: format(d, 'EEE'), 
        date: format(d, 'dd'), 
        fullDate: key,
        count 
      };
    })
  };

  return { processed, priorityQueue, stats };
}

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
  const ordersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'orders'), orderBy('fechaIngreso', 'desc'));
  }, [firestore]);

  const { data: allOrders, isLoading, error } = useCollection<Order>(ordersQuery);
  const { priorityQueue, stats } = useMemo(() => getWorkloadData(allOrders || []), [allOrders]);

  if (isLoading) return <div className="h-screen flex items-center justify-center text-slate-400">Loading Workload...</div>;
  if (error) return <div className="p-8 text-red-500">Error: {error.message}</div>;

  return (
    <div className="flex-1 space-y-8 p-8 pt-6 min-h-screen bg-slate-50/50">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Production Workload</h2>
          <p className="text-muted-foreground text-lg">Operational health & priority queue</p>
        </div>
        <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-500">Total Active: {stats.totalActive}</span>
        </div>
      </div>

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
                <p className="text-xs text-muted-foreground mt-1">Orders overdue or due today</p>
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
                <p className="text-xs text-muted-foreground mt-1">Complex orders due soon</p>
            </CardContent>
        </Card>

        <Card className="col-span-2">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500 uppercase">7-Day Horizon</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-end justify-between gap-2 h-16 mt-2">
                    {stats.horizon.map((day, i) => (
                        <div key={i} className="flex flex-col items-center gap-2 flex-1 group">
                            <div className="relative w-full flex items-end justify-center h-12">
                                <div 
                                    className={`w-full max-w-[24px] rounded-t-sm transition-all ${day.count > 0 ? 'bg-indigo-100 group-hover:bg-indigo-200' : 'bg-slate-50'}`} 
                                    style={{ height: `${Math.min(100, Math.max(10, day.count * 15))}%` }}
                                ></div>
                                {day.count > 0 && (
                                    <span className="absolute -top-4 text-xs font-bold text-indigo-600">{day.count}</span>
                                )}
                            </div>
                            <div className="text-center">
                                <div className="text-[10px] uppercase font-bold text-slate-400">{day.day}</div>
                                <div className="text-xs font-medium text-slate-700">{day.date}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                <Clock className="h-5 w-5 text-slate-500" />
                Priority Queue
            </h3>
            {priorityQueue.length === 0 && (
                <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> All clear
                </Badge>
            )}
        </div>

        {priorityQueue.length > 0 ? (
            <div className="rounded-md border border-slate-200 bg-white overflow-hidden shadow-sm">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead className="w-[100px]">Status</TableHead>
                            <TableHead>Order</TableHead>
                            <TableHead>Client</TableHead>
                            <TableHead>Due Date</TableHead>
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
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="text-sm text-slate-700">
                                            {order.entrega ? format((order.entrega as any).toDate ? (order.entrega as any).toDate() : new Date(order.entrega as any), 'MMM dd') : '-'}
                                        </span>
                                        <span className="text-xs text-slate-400">
                                           {order.daysUntilDue === 0 ? 'Today' : order.daysUntilDue === 1 ? 'Tomorrow' : `In ${order.daysUntilDue} days`}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs">${order.orderTotal}</span>
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
                                            Edit <ArrowRight className="ml-2 h-3 w-3" />
                                        </Link>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <CheckCircle2 className="h-10 w-10 text-emerald-400 mb-2" />
                <h3 className="text-lg font-medium text-slate-900">All caught up!</h3>
                <p className="text-slate-500">No urgent orders requiring attention.</p>
            </div>
        )}
      </div>
    </div>
  );
}
