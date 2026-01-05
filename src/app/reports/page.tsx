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
    Line
} from 'recharts';
import { useLanguage } from '@/contexts/language-context';

// --- Types & Helper Functions ---

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

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
                    value={`$${kpis.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
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
                    value={`$${kpis.potentialRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
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
                    value={`$${kpis.totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    icon={DollarSign}
                    subtext="Pending payments"
                />
                <KPICard
                    title="Avg. Order Value"
                    value={`$${kpis.averageOrderValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    icon={TrendingUp}
                    subtext="Revenue / Total Orders"
                />
                <KPICard
                    title="ITBMS Collected"
                    value={`$${kpis.totalITBMS.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
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

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">

                {/* Revenue Analysis Chart - Stacked (Completed vs Active vs Quotes) */}
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Business Health</CardTitle>
                        <CardDescription>Realized (Completed) vs Active Revenue vs Potential (Quotes)</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={revenueTrends}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis
                                        dataKey="name"
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tick={{ fontSize: 10 }}
                                    />
                                    <YAxis
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `$${value}`}
                                    />
                                    <Tooltip
                                        formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                                        cursor={{ fill: 'transparent' }}
                                    />
                                    <Legend />
                                    <Bar dataKey="Completed" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} name="Done (Realized)" />
                                    <Bar dataKey="Active" stackId="a" fill="#0f172a" radius={[0, 0, 4, 4]} name="In Progress" />
                                    <Bar dataKey="Quotes" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Quotes (Potential)" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Top Products */}
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Top Products</CardTitle>
                        <CardDescription>By Revenue (Confirmed Orders)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[350px] w-full">
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
                                        formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
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

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Status Chart */}
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
            </div>
        </div>
    );
}
