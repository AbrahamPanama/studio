
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
  isSameDay,
} from 'date-fns';
import {
  Flame,
  AlertTriangle,
  Clock,
  ExternalLink,
  CheckCircle2,
  CalendarDays,
  Filter,
  X,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/language-context';

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
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  getOrderComplexity,
  getSafeBuffer,
  type ComplexityLevel,
} from '@/lib/workload-utils';
import { ComplexityTagSelector } from '@/components/workload/complexity-tag-selector';

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
  selectedDate: string | null,
  selectedUrgency: UrgencyLevel | null // NEW
) {
  const now = startOfDay(new Date());

  // 1. Base Filter: Active Orders Only
  const activeOrders = orders.filter(
    (o) => o.estado !== 'Cotización' && o.estado !== 'Done'
  );

  // Helper to parse dates safely
  const getTargetDate = (order: Order) => {
    const rawDate = order.entregaLimite || order.entrega;
    if (rawDate && typeof (rawDate as any).toDate === 'function')
      return (rawDate as any).toDate();
    if (rawDate instanceof Date) return rawDate;
    if (typeof rawDate === 'string') return new Date(rawDate);
    return null;
  };

  // ------------------------------------------------
  // PASS 1: Build Horizon (Global View)
  // ------------------------------------------------
  const dailyVolume = new Map<
    string,
    { total: number; high: number; medium: number; low: number }
  >();

  // Initialize Horizon Keys
  for (let i = 0; i < horizonDays; i++) {
    const date = addDays(now, i);
    
    // Skip Sunday if toggle is off
    if (!includeSundays && isSunday(date)) {
        continue;
    }

    dailyVolume.set(format(date, 'yyyy-MM-dd'), {
      total: 0,
      high: 0,
      medium: 0,
      low: 0,
    });
  }

  // Pre-process all orders to categorize them and populate horizon
  const preparedOrders = activeOrders
    .map((order) => {
      const targetDate = getTargetDate(order);
      if (!targetDate || isNaN(targetDate.getTime())) return null;

      // Sunday Check
      if (!includeSundays && isSunday(targetDate)) return null;

      // Complexity Logic
      const { level: complexityLevel } = getOrderComplexity(order);

      // Update Horizon Map
      const key = format(startOfDay(targetDate), 'yyyy-MM-dd');
      if (dailyVolume.has(key)) {
        const entry = dailyVolume.get(key)!;
        entry.total += 1;
        if (complexityLevel === 'HIGH') entry.high += 1;
        else if (complexityLevel === 'MEDIUM') entry.medium += 1;
        else entry.low += 1;
      }

      return { order, targetDate };
    })
    .filter((o): o is NonNullable<typeof o> => o !== null);

  // ------------------------------------------------
  // PASS 2: Build View (Filtered View)
  // ------------------------------------------------
  const viewOrders = selectedDate
    ? preparedOrders.filter(
      (o) => format(startOfDay(o.targetDate), 'yyyy-MM-dd') === selectedDate
    )
    : preparedOrders;

  const processed: WorkloadItem[] = [];

  viewOrders.forEach(({ order, targetDate }) => {
    const dayStart = startOfDay(targetDate);
    const daysUntilDue = differenceInDays(dayStart, now);

    const { level: complexityLevel } = getOrderComplexity(order);
    const safeBuffer = getSafeBuffer(complexityLevel);

    let urgency: UrgencyLevel = 'NORMAL';
    if (daysUntilDue <= 0) urgency = 'CRITICAL';
    else if (daysUntilDue <= safeBuffer) urgency = 'WARNING';

    processed.push({
      ...order,
      daysUntilDue,
      urgency,
      complexityBuffer: safeBuffer,
      targetDate,
    });
  });

  // Filter Priority Queue
  const priorityQueue = processed
    .filter((o) => {
      // 1. Horizon Window Check (Always applies)
      const inWindow = o.daysUntilDue <= horizonDays;
      if (!inWindow) return false;

      // 2. Urgency Filter (If selected)
      if (selectedUrgency && o.urgency !== selectedUrgency) return false;

      return true;
    })
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue);


  // View Stats
  const stats = {
    critical: processed.filter((o) => o.urgency === 'CRITICAL').length,
    warning: processed.filter((o) => o.urgency === 'WARNING').length,
    totalActive: processed.length,
    // Horizon Array (Always shows global context)
    horizon: Array.from(dailyVolume.entries()).map(([key, vol]) => {
      const d = new Date(key + 'T00:00:00');
      return {
        day: format(d, 'EEE'),
        date: format(d, 'dd'),
        fullDate: key,
        ...vol,
      };
    }),
  };

  return { priorityQueue, stats };
}

// ----------------------------------------------------------------------
// COMPONENTS
// ----------------------------------------------------------------------

function UrgencyBadge({ level, days }: { level: UrgencyLevel; days: number }) {
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
      <Badge
        variant="secondary"
        className="bg-amber-100 text-amber-800 hover:bg-amber-200 flex items-center gap-1"
      >
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
  const { t } = useLanguage();

  // State
  const [includeSundays, setIncludeSundays] = useState(false);
  const [horizonDays, setHorizonDays] = useState(7);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedUrgency, setSelectedUrgency] = useState<UrgencyLevel | null>(
    null
  );

  // Queries
  const ordersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'orders'), orderBy('fechaIngreso', 'desc'));
  }, [firestore]);

  const { data: allOrders, isLoading, error } = useCollection<Order>(ordersQuery);

  // Computed Data
  const { priorityQueue, stats } = useMemo(
    () =>
      getWorkloadData(
        allOrders || [],
        includeSundays,
        horizonDays,
        selectedDate,
        selectedUrgency // Pass it here
      ),
    [allOrders, includeSundays, horizonDays, selectedDate, selectedUrgency]
  );

  // Handlers
  const copyPhoneNumber = (phone: string) => {
    let clean = phone.replace(/\D/g, '');
    if (clean.startsWith('507') && clean.length > 7)
      clean = clean.replace(/^507/, '');
    navigator.clipboard.writeText(clean);
    toast({ description: 'Phone copied: ' + clean });
  };

  const handleUrgencyClick = (level: UrgencyLevel) => {
    if (selectedUrgency === level) {
      setSelectedUrgency(null); // Toggle off
    } else {
      setSelectedUrgency(level);
      setSelectedDate(null); // Mutual exclusivity for clearer UX
    }
  };

  const handleBarClick = (date: string) => {
    if (selectedDate === date) {
      setSelectedDate(null);
    } else {
      setSelectedDate(date);
      setSelectedUrgency(null);
    }
  };

  const clearFilters = () => {
    setSelectedDate(null);
    setSelectedUrgency(null);
  };

  if (isLoading)
    return (
      <div className="h-screen flex items-center justify-center text-slate-400">
        {t('loadingWorkload')}
      </div>
    );
  if (error) return <div className="p-8 text-red-500">Error: {error.message}</div>;

  // Max value for chart scaling
  const maxDailyVolume = Math.max(...stats.horizon.map((d) => d.total), 1);

  const getPageTitle = () => {
    if (selectedUrgency) {
      return selectedUrgency === 'CRITICAL' ? t('immediateActionItems') : t('atRiskItems');
    }
    if (selectedDate) {
      return t('workloadForDate', { date: selectedDate });
    }
    return t('upcomingWorkload', { days: horizonDays });
  }

  return (
    <div className="flex-1 space-y-8 p-8 pt-6 min-h-screen bg-slate-50/50">
      {/* Header & Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            {t('productionWorkload')}
          </h2>
          <p className="text-muted-foreground text-lg">
            {t('operationalHealth')}
            {selectedDate && (
              <span className="text-indigo-600 font-medium ml-2">
                • {t('filteredBy', { filter: selectedDate })}
              </span>
            )}
            {selectedUrgency && (
              <span className="text-indigo-600 font-medium ml-2">
                • {t('filteredBy', { filter: selectedUrgency })}
              </span>
            )}
          </p>
        </div>

        {/* Controls Toolbar */}
        <div className="flex items-center gap-4 bg-white p-2 px-4 rounded-lg border border-slate-200 shadow-sm flex-wrap">
          {(selectedDate || selectedUrgency) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8"
            >
              <X className="h-4 w-4 mr-1" /> {t('clearFilter')}
            </Button>
          )}
          <div className="h-4 w-px bg-slate-200 hidden md:block" />
          <div className="flex items-center space-x-2">
            <Switch
              id="sunday-mode"
              checked={includeSundays}
              onCheckedChange={setIncludeSundays}
            />
            <Label htmlFor="sunday-mode" className="text-sm text-slate-600">
              {t('sundays')}
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <CalendarDays className="h-4 w-4 text-slate-400" />
            <Select
              value={horizonDays.toString()}
              onValueChange={(v) => setHorizonDays(parseInt(v))}
            >
              <SelectTrigger className="w-[110px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">{t('oneWeek')}</SelectItem>
                <SelectItem value="14">{t('twoWeeks')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Row 1: The Pulse */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* CARD 1: IMMEDIATE ACTION */}
        <Card
          onClick={() => handleUrgencyClick('CRITICAL')}
          className={`border-l-4 cursor-pointer transition-all hover:scale-[1.02] ${stats.critical > 0 ? 'border-l-red-500 bg-red-50/30' : 'border-l-slate-200'
            } ${selectedUrgency === 'CRITICAL' ? 'ring-2 ring-red-500 ring-offset-2' : ''}`}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 uppercase">{t('immediateAction')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Flame className={`h-12 w-12 ${stats.critical > 0 ? 'text-red-500' : 'text-slate-300'}`} />
              <div className="text-5xl font-bold text-slate-900">{stats.critical}</div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {selectedDate ? t('criticalOrdersOnDay') : t('totalOverdueOrDueToday')}
            </p>
          </CardContent>
        </Card>

        {/* CARD 2: AT RISK */}
        <Card
          onClick={() => handleUrgencyClick('WARNING')}
          className={`border-l-4 cursor-pointer transition-all hover:scale-[1.02] ${stats.warning > 0 ? 'border-l-amber-500 bg-amber-50/30' : 'border-l-slate-200'
            } ${selectedUrgency === 'WARNING' ? 'ring-2 ring-amber-500 ring-offset-2' : ''}`}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 uppercase">{t('atRisk')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <AlertTriangle className={`h-12 w-12 ${stats.warning > 0 ? 'text-amber-500' : 'text-slate-300'}`} />
              <div className="text-5xl font-bold text-slate-900">{stats.warning}</div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {selectedDate ? t('riskOrdersOnDay') : t('complexOrdersDueSoon')}
            </p>
          </CardContent>
        </Card>

        {/* COMPOSITE INTERACTIVE CHART */}
        <Card className="col-span-2">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-slate-500 uppercase">
              {horizonDays}-Day Horizon
            </CardTitle>
            <div className="flex gap-2 text-[10px] text-slate-400">
              <span className="flex items-center">
                <div className="w-2 h-2 bg-rose-400 rounded-full mr-1" />
                {t('complexityHigh')}
              </span>
              <span className="flex items-center">
                <div className="w-2 h-2 bg-amber-400 rounded-full mr-1" />
                {t('complexityMed')}
              </span>
              <span className="flex items-center">
                <div className="w-2 h-2 bg-blue-400 rounded-full mr-1" />
                {t('complexityLow')}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-1 h-48 mt-2 overflow-x-auto pb-6">
              {stats.horizon.map((day, i) => {
                const isSelected = selectedDate === day.fullDate;
                // Calculate relative height for the whole bar
                const barHeightPercent = Math.max(15, (day.total / maxDailyVolume) * 100);

                return (
                  <div
                    key={i}
                    onClick={() => handleBarClick(day.fullDate)}
                    className={`flex flex-col items-center gap-2 min-w-[35px] flex-1 cursor-pointer group transition-all rounded-md p-1 ${isSelected ? 'bg-indigo-50 ring-1 ring-indigo-200' : 'hover:bg-slate-50'}`}
                    title={`Date: ${day.date}\nTotal: ${day.total}\nHigh: ${day.high}\nMedium: ${day.medium}\nLow: ${day.low}`}
                  >
                    <div className="relative w-full flex items-end justify-center h-32">
                      {/* Stacked Bar Container */}
                      <div
                        className={`w-full max-w-[24px] rounded-sm overflow-hidden flex flex-col-reverse transition-all opacity-90 group-hover:opacity-100 ${isSelected ? 'ring-2 ring-indigo-600 ring-offset-1' : ''}`}
                        style={{ height: `${barHeightPercent}%` }}
                      >
                        {/* Low Segment */}
                        {day.low > 0 && (
                          <div style={{ flex: day.low }} className="bg-blue-400 w-full min-h-[4px] border-t border-white/20 flex items-center justify-center">
                            {day.low > 0 && barHeightPercent > 10 && <span className="text-[9px] font-bold text-white/90 leading-none">{day.low}</span>}
                          </div>
                        )}
                        {/* Med Segment */}
                        {day.medium > 0 && (
                          <div style={{ flex: day.medium }} className="bg-amber-400 w-full min-h-[4px] border-t border-white/20 flex items-center justify-center">
                            {day.medium > 0 && barHeightPercent > 10 && <span className="text-[9px] font-bold text-white/90 leading-none">{day.medium}</span>}
                          </div>
                        )}
                        {/* High Segment */}
                        {day.high > 0 && (
                          <div style={{ flex: day.high }} className="bg-rose-400 w-full min-h-[4px] border-t border-white/20 flex items-center justify-center">
                            {day.high > 0 && barHeightPercent > 10 && <span className="text-[9px] font-bold text-white/90 leading-none">{day.high}</span>}
                          </div>
                        )}

                        {/* Zero State */}
                        {day.total === 0 && <div className="h-1 bg-slate-100 w-full" />}
                      </div>

                      {day.total > 0 && (
                        <span className={`absolute -top-6 text-[10px] font-bold ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`}>
                          {day.total}
                        </span>
                      )}
                    </div>
                    <div className="text-center">
                      <div className={`text-[9px] uppercase font-bold ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`}>{day.day}</div>
                      <div className={`text-[10px] font-medium ${isSelected ? 'text-indigo-700' : 'text-slate-700'}`}>{day.date}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Priority Queue */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <Clock className="h-5 w-5 text-slate-500" />
            {getPageTitle()}
          </h3>
        </div>

        {priorityQueue.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <CheckCircle2 className="h-10 w-10 text-emerald-400 mb-2" />
            <h3 className="text-lg font-medium text-slate-900">
              {t('allCaughtUp')}
            </h3>
            <p className="text-slate-500">
              {selectedDate
                ? t('noOrdersDue', { date: selectedDate })
                : t('noActiveOrders')}
            </p>
          </div>
        ) : (
          <div className="rounded-md border border-slate-200 bg-white overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[100px]">{t('colStatus')}</TableHead>
                  <TableHead>{t('colOrder')}</TableHead>
                  <TableHead>{t('colClient')}</TableHead>
                  <TableHead>{t('colProducts')}</TableHead>
                  <TableHead>{t('colTargetDate')}</TableHead>
                  <TableHead>{t('colValueComplexity')}</TableHead>
                  <TableHead className="text-right">{t('colAction')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {priorityQueue.map((order) => (
                  <TableRow key={order.id} className="hover:bg-slate-50/50">
                    <TableCell>
                      <UrgencyBadge
                        level={order.urgency}
                        days={order.daysUntilDue}
                      />
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
                        <span className="font-medium text-slate-900">
                          {order.name}
                        </span>
                        <span className="text-xs text-slate-500">
                          {order.companyName}
                        </span>
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
                          <div
                            key={idx}
                            className="text-xs text-slate-600 leading-tight"
                          >
                            <span className="font-medium text-slate-900">
                              • {p.name}
                            </span>
                            {(p as any).description && (
                              <span className="text-slate-400">
                                {' '}
                                - {(p as any).description}
                              </span>
                            )}
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
                          {order.daysUntilDue === 0
                            ? t('today')
                            : order.daysUntilDue === 1
                              ? t('tomorrow')
                              : t('inDays', { days: order.daysUntilDue })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">
                          ${(order.orderTotal || 0).toFixed(2)}
                        </span>
                        <ComplexityTagSelector order={order} />
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/orders/${order.id}/edit`}>{t('edit')}</Link>
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
