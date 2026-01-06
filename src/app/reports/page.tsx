'use client';

import React, { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { Order } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DollarSign, ShoppingCart, TrendingUp, FileText, Percent, Truck, Building2 } from 'lucide-react';
import {
    Bar,
    BarChart,
    ComposedChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    LineChart,
    Line,
    ReferenceLine
} from 'recharts';
import { useLanguage } from '@/contexts/language-context';
import {
    startOfWeek,
    endOfWeek,
    subWeeks,
    subDays,
    isSameWeek,
    isSameYear,
    isSameDay,
    startOfYear,
    endOfYear,
    format,
    eachDayOfInterval,
    eachWeekOfInterval
} from 'date-fns';

// --- Types & Helper Functions ---

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

function formatCurrency(value: number) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
}

function calculateKPIs(orders: Order[] = []) {
    const safeOrders = orders || [];

    // Split into Quotes and Confirmed Orders
    const quotes = safeOrders.filter(o => o.estado === 'Cotización');
    const confirmedOrders = safeOrders.filter(o => o.estado !== 'Cotización');

    // Orders Metrics
    const totalRevenue = confirmedOrders.reduce((sum, o) => sum + (o.orderTotal || 0), 0);
    const totalOrders = confirmedOrders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const totalOutstanding = confirmedOrders.reduce((sum, o) => {
        const paid = o.totalAbono || 0;
        const total = o.orderTotal || 0;
        return sum + Math.max(0, total - paid);
    }, 0);

    // Quotes Metrics
    const potentialRevenue = quotes.reduce((sum, o) => sum + (o.orderTotal || 0), 0);
    const totalQuotes = quotes.length;

    // Conversion Rate
    const totalOpportunities = totalOrders + totalQuotes;
    const conversionRate = totalOpportunities > 0 ? (totalOrders / totalOpportunities) * 100 : 0;

    // Operational Metrics
    const totalITBMS = confirmedOrders.reduce((sum, o) => sum + (o.tax || 0), 0);
    const unoExpressOrders = confirmedOrders.filter(o => o.servicioEntrega === 'Uno Express');
    const totalUnoExpress = unoExpressOrders.length;

    return {
        totalRevenue,
        totalOrders,
        averageOrderValue,
        totalOutstanding,
        potentialRevenue,
        totalQuotes,
        conversionRate,
        totalITBMS,
        totalUnoExpress
    };
}

function getOrdersByStatus(orders: Order[]) {
    const statusCount: Record<string, number> = {};

    orders.forEach(order => {
        const status = order.estado || 'Unknown';
        statusCount[status] = (statusCount[status] || 0) + 1;
    });

    return Object.entries(statusCount).map(([name, value]) => ({ name, value }));
}

function getRevenueTrends(orders: Order[]) {
    // Group by Month (YYYY-MM) with split: Completed (Done), Active (Others), Quotes
    const dataByMonth: Record<string, { completed: number, active: number, quotes: number }> = {};

    orders.forEach(order => {
        let dateObj: Date | null = null;
        if (order.fechaIngreso && typeof (order.fechaIngreso as any).toDate === 'function') {
            dateObj = (order.fechaIngreso as any).toDate();
        } else if (order.fechaIngreso instanceof Date) {
            dateObj = order.fechaIngreso;
        } else if (typeof order.fechaIngreso === 'string') {
            dateObj = new Date(order.fechaIngreso);
        }

        if (dateObj) {
            const key = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
            if (!dataByMonth[key]) {
                dataByMonth[key] = { completed: 0, active: 0, quotes: 0 };
            }

            const amount = order.orderTotal || 0;
            if (order.estado === 'Cotización') {
                dataByMonth[key].quotes += amount;
            } else if (order.estado === 'Done') {
                dataByMonth[key].completed += amount;
            } else {
                // All other statuses are "Active" work in progress
                dataByMonth[key].active += amount;
            }
        }
    });

    return Object.keys(dataByMonth).sort().map(key => ({
        name: key,
        Completed: dataByMonth[key].completed,
        Active: dataByMonth[key].active,
        Quotes: dataByMonth[key].quotes
    }));
}

function getTopProducts(orders: Order[]) {
    const productRevenue: Record<string, number> = {};
    // Only verify confirmed orders for top products to avoid skewing with huge fake quotes
    const confirmedOrders = orders.filter(o => o.estado !== 'Cotización');

    confirmedOrders.forEach(order => {
        if (order.productos && Array.isArray(order.productos)) {
            order.productos.forEach(prod => {
                const name = prod.name || 'Unknown Product';
                // Calculate revenue for this product instance
                const revenue = (prod.price || 0) * (prod.quantity || 1);
                productRevenue[name] = (productRevenue[name] || 0) + revenue;
            });
        }
    });

    // Sort and take top 5
    return Object.entries(productRevenue)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
}

function getAverageOrderValueTrends(orders: Order[]) {
    // 1. Filter confirmed orders only
    const confirmedOrders = orders.filter(o => o.estado !== 'Cotización');
    const now = new Date();

    // 2. Prepare buckets: Last 4 weeks and Current Year
    const weeksData = new Map<string, { total: number, count: number, label: string }>();

    // Initialize last 4 weeks keys
    for (let i = 3; i >= 0; i--) {
        const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 }); // Monday start
        const key = format(weekStart, 'yyyy-MM-dd');
        weeksData.set(key, {
            total: 0,
            count: 0,
            label: `Week ${format(weekStart, 'w')}`
        });
    }

    let yearTotal = 0;
    let yearCount = 0;

    // 3. Iterate orders
    confirmedOrders.forEach(order => {
        let dateObj: Date | null = null;
        if (order.fechaIngreso && typeof (order.fechaIngreso as any).toDate === 'function') {
            dateObj = (order.fechaIngreso as any).toDate();
        } else if (order.fechaIngreso instanceof Date) {
            dateObj = order.fechaIngreso;
        } else if (typeof order.fechaIngreso === 'string') {
            dateObj = new Date(order.fechaIngreso);
        }

        if (dateObj) {
            const amount = order.orderTotal || 0;

            // Check Year
            if (isSameYear(dateObj, now)) {
                yearTotal += amount;
                yearCount++;
            }

            // Check Weeks
            const orderWeekStart = startOfWeek(dateObj, { weekStartsOn: 1 });
            const key = format(orderWeekStart, 'yyyy-MM-dd');
            if (weeksData.has(key)) {
                const bucket = weeksData.get(key)!;
                bucket.total += amount;
                bucket.count += 1;
            }
        }
    });

    // 4. Format for Chart
    const result = [];

    // Add weeks
    weeksData.forEach((value, key) => {
        result.push({
            name: value.label,
            value: value.count > 0 ? value.total / value.count : 0,
            type: 'Week'
        });
    });

    // Add Year Avg
    result.push({
        name: 'Year Avg',
        value: yearCount > 0 ? yearTotal / yearCount : 0,
        type: 'Year'
    });

    return result;
}

// --- New Charts ---

function getDailyQuotesVsOrders(orders: Order[]) {
    // Last 7 Days
    const now = new Date();
    const days = eachDayOfInterval({ start: subDays(now, 6), end: now });

    // Map: 'yyyy-MM-dd' -> { date, quoteCount, orderCount }
    const dailyData = new Map<string, { name: string, Quotes: number, Orders: number }>();

    days.forEach(day => {
        dailyData.set(format(day, 'yyyy-MM-dd'), {
            name: format(day, 'EEE dd'), // Mon 01
            Quotes: 0,
            Orders: 0
        });
    });

    orders.forEach(order => {
        let dateObj: Date | null = null;
        if (order.fechaIngreso && typeof (order.fechaIngreso as any).toDate === 'function') {
            dateObj = (order.fechaIngreso as any).toDate();
        } else if (order.fechaIngreso instanceof Date) {
            dateObj = order.fechaIngreso;
        } else if (typeof order.fechaIngreso === 'string') {
            dateObj = new Date(order.fechaIngreso);
        }

        if (dateObj) {
            const key = format(dateObj, 'yyyy-MM-dd');
            if (dailyData.has(key)) {
                const entry = dailyData.get(key)!;
                if (order.estado === 'Cotización') {
                    entry.Quotes += 1;
                } else {
                    entry.Orders += 1;
                }
            }
        }
    });

    return Array.from(dailyData.values());
}

function getWeeklyQuotesVsOrders(orders: Order[]) {
    // Last 4 Weeks
    const now = new Date();
    // 4 weeks ago
    const start = startOfWeek(subWeeks(now, 3), { weekStartsOn: 1 });
    const weeks = eachWeekOfInterval({ start, end: now }, { weekStartsOn: 1 });

    const weeklyData = new Map<string, { name: string, Quotes: number, Orders: number }>();

    weeks.forEach(weekStart => {
        weeklyData.set(format(weekStart, 'yyyy-MM-dd'), {
            name: `W${format(weekStart, 'w')}`,
            Quotes: 0,
            Orders: 0
        });
    });

    orders.forEach(order => {
        let dateObj: Date | null = null;
        if (order.fechaIngreso && typeof (order.fechaIngreso as any).toDate === 'function') {
            dateObj = (order.fechaIngreso as any).toDate();
        } else if (order.fechaIngreso instanceof Date) {
            dateObj = order.fechaIngreso;
        } else if (typeof order.fechaIngreso === 'string') {
            dateObj = new Date(order.fechaIngreso);
        }

        if (dateObj) {
            const weekStart = startOfWeek(dateObj, { weekStartsOn: 1 });
            const key = format(weekStart, 'yyyy-MM-dd');

            if (weeklyData.has(key)) {
                const entry = weeklyData.get(key)!;
                if (order.estado === 'Cotización') {
                    entry.Quotes += 1;
                } else {
                    entry.Orders += 1;
                }
            }
        }
    });

    return Array.from(weeklyData.values());
}

function getDailyRevenueWithAvg(orders: Order[]) {
    // Show last 7 days daily revenue, plus a bar for the average of these 7 days
    const now = new Date();
    const days = eachDayOfInterval({ start: subDays(now, 6), end: now });

    const dailyData = new Map<string, { name: string, value: number }>();
    let totalRevenuePeriod = 0;

    days.forEach(day => {
        dailyData.set(format(day, 'yyyy-MM-dd'), {
            name: format(day, 'EEE'),
            value: 0
        });
    });

    // Filter only confirmed orders
    const confirmedOrders = orders.filter(o => o.estado !== 'Cotización');

    confirmedOrders.forEach(order => {
        let dateObj: Date | null = null;
        if (order.fechaIngreso && typeof (order.fechaIngreso as any).toDate === 'function') {
            dateObj = (order.fechaIngreso as any).toDate();
        } else if (order.fechaIngreso instanceof Date) {
            dateObj = order.fechaIngreso;
        } else if (typeof order.fechaIngreso === 'string') {
            dateObj = new Date(order.fechaIngreso);
        }

        if (dateObj) {
            const key = format(dateObj, 'yyyy-MM-dd');
            const amount = order.orderTotal || 0;
            if (dailyData.has(key)) {
                dailyData.get(key)!.value += amount;
                totalRevenuePeriod += amount;
            }
        }
    });

    const result = Array.from(dailyData.values()).map(d => ({ ...d, type: 'Day' }));

    // Add Average Bar
    const avg = totalRevenuePeriod / 7;
    result.push({ name: 'Avg (7d)', value: avg, type: 'Avg' });

    return result;
}

function getWeeklyRevenueTrends(orders: Order[]) {
    // Confirmed orders only
    const confirmedOrders = orders.filter(o => o.estado !== 'Cotización');
    const now = new Date();

    const weeksData = new Map<string, { total: number, label: string }>();

    // Initialize last 4 weeks
    for (let i = 3; i >= 0; i--) {
        const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
        const key = format(weekStart, 'yyyy-MM-dd');
        weeksData.set(key, {
            total: 0,
            label: `W${format(weekStart, 'w')}`
        });
    }

    let yearTotal = 0;

    // Using a set to count unique weeks for year avg correct calculation if needed, 
    // or just assume 52? Better: count weeks that have passed in the year or weeks with orders?
    // "Avg for the year" usually means Total / Weeks passed
    const startOfCurrentYear = startOfYear(now);
    // Rough weeks passed
    const weeksPassed = Math.max(1, ((now.getTime() - startOfCurrentYear.getTime()) / (1000 * 60 * 60 * 24 * 7)));

    confirmedOrders.forEach(order => {
        let dateObj: Date | null = null;
        if (order.fechaIngreso && typeof (order.fechaIngreso as any).toDate === 'function') {
            dateObj = (order.fechaIngreso as any).toDate();
        } else if (order.fechaIngreso instanceof Date) {
            dateObj = order.fechaIngreso;
        } else if (typeof order.fechaIngreso === 'string') {
            dateObj = new Date(order.fechaIngreso);
        }

        if (dateObj) {
            const amount = order.orderTotal || 0;

            if (isSameYear(dateObj, now)) {
                yearTotal += amount;
            }

            const orderWeekStart = startOfWeek(dateObj, { weekStartsOn: 1 });
            const key = format(orderWeekStart, 'yyyy-MM-dd');
            if (weeksData.has(key)) {
                weeksData.get(key)!.total += amount;
            }
        }
    });

    const result = [];
    weeksData.forEach((value) => {
        result.push({
            name: value.label,
            value: value.total,
            type: 'Week'
        });
    });

    // Periodic Average (Weekly)
    // Avg = Total Year Revenue / Weeks Passed
    const weeklyAvg = yearTotal / weeksPassed;
    result.push({
        name: 'Avg (Yr)',
        value: weeklyAvg,
        type: 'Year'
    });

    return result;
}

function getConversionTrend(orders: Order[]) {
    // Goal: Show last 6 months of "Leads" (Quotes + Orders) vs "Wins" (Orders)
    const now = new Date();
    // Generate keys for the last 6 months
    const monthsData = new Map<string, { name: string, TotalLeads: number, Orders: number }>();

    for (let i = 5; i >= 0; i--) {
        const date = subDays(now, i * 30); // Approx month steps
        const key = format(date, 'yyyy-MM');
        monthsData.set(key, {
            name: format(date, 'MMM'),
            TotalLeads: 0,
            Orders: 0
        });
    }

    orders.forEach(order => {
        let dateObj: Date | null = null;
        if (order.fechaIngreso && typeof (order.fechaIngreso as any).toDate === 'function') {
            dateObj = (order.fechaIngreso as any).toDate();
        } else if (order.fechaIngreso instanceof Date) {
            dateObj = order.fechaIngreso;
        } else if (typeof order.fechaIngreso === 'string') {
            dateObj = new Date(order.fechaIngreso);
        }

        if (dateObj) {
            const key = format(dateObj, 'yyyy-MM');
            if (monthsData.has(key)) {
                const entry = monthsData.get(key)!;
                // Every record is a "Lead"
                entry.TotalLeads += 1;
                
                // If it's not a Quote, it counts as a converted "Order"
                if (order.estado !== 'Cotización') {
                    entry.Orders += 1;
                }
            }
        }
    });

    // Calculate Rate
    return Array.from(monthsData.values()).map(d => ({
        ...d,
        ConversionRate: d.TotalLeads > 0 ? Math.round((d.Orders / d.TotalLeads) * 100) : 0
    }));
}

function getVolumeComparison(orders: Order[]) {
    const now = new Date();
    const confirmedOrders = orders.filter(o => o.estado !== 'Cotización');
    
    // Default: 90 Days
    let startDate = subDays(now, 90);
    let daysPeriod = 90;

    const getDate = (o: Order): Date | null => {
        if (o.fechaIngreso && typeof (o.fechaIngreso as any).toDate === 'function') return (o.fechaIngreso as any).toDate();
        if (o.fechaIngreso instanceof Date) return o.fechaIngreso;
        if (typeof o.fechaIngreso === 'string') {
          try {
            const d = new Date(o.fechaIngreso);
            if (!isNaN(d.getTime())) return d;
          } catch {
             return null;
          }
        }
        return null;
    };

    // Intelligent Start Date: If oldest order is newer than 90 days, use that.
    if (confirmedOrders.length > 0) {
        // Orders are usually sorted desc, so check the last one or sort explicitly if unsure
        const sorted = [...confirmedOrders].sort((a, b) => {
             const dA = getDate(a)?.getTime() || 0;
             const dB = getDate(b)?.getTime() || 0;
             return dA - dB;
        });
        const oldestDate = getDate(sorted[0]);

        if (oldestDate && oldestDate > startDate) {
            startDate = oldestDate;
            const diffTime = Math.abs(now.getTime() - oldestDate.getTime());
            daysPeriod = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24))); 
        }
    }

    // Calculate Average
    const ordersInWindow = confirmedOrders.filter(o => {
        const d = getDate(o);
        return d && d >= startDate && d <= now;
    });
    const avgDaily = ordersInWindow.length / daysPeriod;

    // Last 7 Days Data
    const last7Days = eachDayOfInterval({ start: subDays(now, 6), end: now });
    const dailyData = last7Days.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const count = confirmedOrders.filter(o => {
            const d = getDate(o);
            return d && !isNaN(d.getTime()) && format(d, 'yyyy-MM-dd') === dayStr;
        }).length;
        return { name: format(day, 'EEE'), Orders: count };
    });

    return { dailyData, avg: parseFloat(avgDaily.toFixed(1)), daysUsed: daysPeriod };
}


// --- Components ---

function KPICard({ title, value, icon: Icon, subtext, highlight = false }: { title: string, value: string, icon: any, subtext?: string, highlight?: boolean }) {
    return (
        <Card className={highlight ? "border-l-4 border-l-blue-500 bg-blue-50/50" : ""}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className=" text-sm font-medium">
                    {title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${highlight ? "text-blue-600" : "text-muted-foreground"}`} />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
            </CardContent>
        </Card>
    );
}

export default function ReportsPage() {
    const firestore = useFirestore();
    const { t } = useLanguage();

    const ordersQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'orders'), orderBy('fechaIngreso', 'desc'));
    }, [firestore]);

    const { data: allOrders, isLoading, error } = useCollection<Order>(ordersQuery);

    const kpis = useMemo(() => calculateKPIs(allOrders || []), [allOrders]);
    const statusData = useMemo(() => getOrdersByStatus(allOrders || []), [allOrders]);
    const revenueTrends = useMemo(() => getRevenueTrends(allOrders || []), [allOrders]);
    const topProducts = useMemo(() => getTopProducts(allOrders || []), [allOrders]);
    const aovTrends = useMemo(() => getAverageOrderValueTrends(allOrders || []), [allOrders]);

    // New Metrics
    const dailyQuotesVsOrders = useMemo(() => getDailyQuotesVsOrders(allOrders || []), [allOrders]);
    const weeklyQuotesVsOrders = useMemo(() => getWeeklyQuotesVsOrders(allOrders || []), [allOrders]);
    const dailyRevenueAvg = useMemo(() => getDailyRevenueWithAvg(allOrders || []), [allOrders]);
    const weeklyRevenueTrends = useMemo(() => getWeeklyRevenueTrends(allOrders || []), [allOrders]);
    const conversionTrend = useMemo(() => getConversionTrend(allOrders || []), [allOrders]);
    const volumeComp = useMemo(() => getVolumeComparison(allOrders || []), [allOrders]);

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen bg-slate-50"><p className="text-slate-500 font-medium animate-pulse">Loading reports...</p></div>;
    }

    if (error) {
        return <div className="p-8 text-red-500">Error loading reports: {error.message}</div>;
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6 min-h-screen bg-slate-50/50">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard & Reports</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Orders KPIs */}
                <KPICard
                    title="Total Revenue"
                    value={formatCurrency(kpis.totalRevenue)}
                    icon={DollarSign}
                    subtext="Confirmed orders"
                />
                <KPICard
                    title="Total Orders"
                    value={kpis.totalOrders.toString()}
                    icon={ShoppingCart}
                    subtext="Confirmed orders"
                />

                {/* Quotes KPIs - Highlighted */}
                <KPICard
                    title="Potential Revenue"
                    value={formatCurrency(kpis.potentialRevenue)}
                    icon={DollarSign}
                    subtext="Active Quotes"
                    highlight={true}
                />
                <KPICard
                    title="Active Quotes"
                    value={kpis.totalQuotes.toString()}
                    icon={FileText}
                    subtext="Pending conversion"
                    highlight={true}
                />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <KPICard
                    title="Outstanding Balance"
                    value={formatCurrency(kpis.totalOutstanding)}
                    icon={DollarSign}
                    subtext="Pending payments"
                />
                <KPICard
                    title="Avg. Order Value"
                    value={formatCurrency(kpis.averageOrderValue)}
                    icon={TrendingUp}
                    subtext="Revenue / Total Orders"
                />
                <KPICard
                    title="ITBMS Collected"
                    value={formatCurrency(kpis.totalITBMS)}
                    icon={Building2}
                    subtext="Total Tax"
                />
                <KPICard
                    title="Uno Express Volume"
                    value={kpis.totalUnoExpress.toString()}
                    icon={Truck}
                    subtext="Dispatched Orders"
                />
            </div>

            {/* NEW: Conversion & Velocity Row */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                
                {/* 1. Conversion Efficiency Chart */}
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Conversion Efficiency</CardTitle>
                        <CardDescription>Quotes turned into Orders (Last 6 Months)</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={conversionTrend}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis 
                                        dataKey="name" 
                                        stroke="#888888" 
                                        fontSize={12} 
                                        tickLine={false} 
                                        axisLine={false} 
                                    />
                                    {/* Left Axis: Volume */}
                                    <YAxis 
                                        yAxisId="left"
                                        stroke="#888888" 
                                        fontSize={12} 
                                        tickLine={false} 
                                        axisLine={false}
                                    />
                                    {/* Right Axis: Percentage */}
                                    <YAxis 
                                        yAxisId="right" 
                                        orientation="right" 
                                        stroke="#82ca9d" 
                                        unit="%" 
                                        fontSize={12} 
                                        tickLine={false} 
                                        axisLine={false}
                                    />
                                    <Tooltip cursor={{ fill: 'transparent' }} />
                                    <Legend />
                                    
                                    {/* Total Opportunities Bar */}
                                    <Bar yAxisId="left" dataKey="TotalLeads" name="Total Opportunities" fill="#e2e8f0" radius={[4, 4, 0, 0]} barSize={32} />
                                    
                                    {/* Conversion Rate Line */}
                                    <Line 
                                        yAxisId="right" 
                                        type="monotone" 
                                        dataKey="ConversionRate" 
                                        name="Conversion Rate" 
                                        stroke="#10b981" 
                                        strokeWidth={3} 
                                        dot={{ r: 4, fill: "#10b981" }} 
                                    />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Volume Velocity Chart */}
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Order Velocity</CardTitle>
                        <CardDescription>Last 7 Days vs {volumeComp.daysUsed}-Day Avg</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={volumeComp.dailyData} margin={{ top: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis 
                                        dataKey="name" 
                                        stroke="#888888" 
                                        fontSize={12} 
                                        tickLine={false} 
                                        axisLine={false} 
                                    />
                                    <YAxis 
                                        stroke="#888888" 
                                        fontSize={12} 
                                        tickLine={false} 
                                        axisLine={false} 
                                        allowDecimals={false}
                                    />
                                    <Tooltip 
                                        cursor={{ fill: '#f1f5f9' }}
                                        formatter={(value: number) => [value, 'Orders']}
                                    />
                                    <Legend />
                                    
                                    {/* Daily Orders Bar */}
                                    <Bar dataKey="Orders" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Daily Orders">
                                        {volumeComp.dailyData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.Orders >= volumeComp.avg ? '#10b981' : '#3b82f6'} />
                                        ))}
                                    </Bar>

                                    {/* Avg Reference Line */}
                                    <ReferenceLine 
                                        y={volumeComp.avg} 
                                        stroke="#f59e0b" 
                                        strokeDasharray="3 3" 
                                        label={{ 
                                            position: 'top', 
                                            value: `${volumeComp.daysUsed}d Avg: ${volumeComp.avg}`, 
                                            fill: '#f59e0b', 
                                            fontSize: 12 
                                        }} 
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Row: Quotes Comparison (Daily & Weekly) */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Quotes vs Orders (Daily)</CardTitle>
                        <CardDescription>Last 7 Days</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={dailyQuotesVsOrders}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis
                                        dataKey="name"
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        allowDecimals={false}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                    />
                                    <Legend />
                                    <Bar dataKey="Orders" fill="#10b981" radius={[4, 4, 0, 0]} name="Orders" />
                                    <Bar dataKey="Quotes" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Quotes" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Quotes vs Orders (Weekly)</CardTitle>
                        <CardDescription>Last 4 Weeks</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={weeklyQuotesVsOrders}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis
                                        dataKey="name"
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        allowDecimals={false}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                    />
                                    <Legend />
                                    <Bar dataKey="Orders" fill="#10b981" radius={[4, 4, 0, 0]} name="Orders" />
                                    <Bar dataKey="Quotes" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Quotes" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Row: Revenue Trends & AOV */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle>Daily Revenue</CardTitle>
                        <CardDescription>Last 7 Days + Weekly Average</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={dailyRevenueAvg}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis
                                        dataKey="name"
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => formatCurrency(value)}
                                    />
                                    <Tooltip
                                        formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                                        cursor={{ fill: 'transparent' }}
                                    />
                                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                        {dailyRevenueAvg.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.type === 'Avg' ? '#FFBB28' : '#0f172a'}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Weekly Revenue</CardTitle>
                        <CardDescription>Last 4 Weeks + Year Avg</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={weeklyRevenueTrends}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis
                                        dataKey="name"
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => formatCurrency(value)}
                                    />
                                    <Tooltip
                                        formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                                        cursor={{ fill: 'transparent' }}
                                    />
                                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                        {weeklyRevenueTrends.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.type === 'Year' ? '#FF8042' : '#8884d8'}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Avg. Order Value</CardTitle>
                        <CardDescription>Last 4 Weeks + Year Avg</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={aovTrends}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis
                                        dataKey="name"
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => formatCurrency(value)}
                                    />
                                    <Tooltip
                                        formatter={(value: number) => [formatCurrency(value), 'Avg Value']}
                                        cursor={{ fill: 'transparent' }}
                                    />
                                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                        {aovTrends.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.type === 'Year' ? '#FFBB28' : '#82ca9d'}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Status Chart - moved to bottom or keep here? Let's give it full width or keep small. 
                    Previous layout had it in row 2. Now row 2 is quotes. 
                    Let's put Status Chart at the end alongside maybe something else or full width.
                */}
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Order Status Distribution</CardTitle>
                        <CardDescription>All records including Quotes</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={statusData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    >
                                        {statusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* OLD Top Products Chart - moved from above */}
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Top Products</CardTitle>
                        <CardDescription>By Revenue (Confirmed Orders)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={topProducts} layout="vertical" margin={{ left: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                    <XAxis type="number" hide />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        width={100}
                                        tick={{ fontSize: 11 }}
                                        interval={0}
                                    />
                                    <Tooltip
                                        formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                                        cursor={{ fill: 'transparent' }}
                                    />
                                    <Bar dataKey="value" fill="#8884d8" radius={[0, 4, 4, 0]}>
                                        {topProducts.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
