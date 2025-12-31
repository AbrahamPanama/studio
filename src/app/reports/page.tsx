'use client';

import React, { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { Order } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DollarSign, ShoppingCart, TrendingUp } from 'lucide-react';
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
    YAxis
} from 'recharts';
import { useLanguage } from '@/contexts/language-context';

// --- Types & Helper Functions ---

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

function calculateKPIs(orders: Order[] = []) {
    // Filter out quotes for revenue
    const confirmedOrders = orders.filter(o => o.estado !== 'Cotización');

    const totalRevenue = confirmedOrders.reduce((sum, o) => sum + (o.orderTotal || 0), 0);
    const totalOrders = confirmedOrders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const totalOutstanding = confirmedOrders.reduce((sum, o) => {
        // Only count if not cancelled and explicitly marked as having outstanding balance logic if needed.
        // Based on schema: totalAbono is what they paid. 
        // Assuming outstanding = orderTotal - totalAbono
        const paid = o.totalAbono || 0;
        const total = o.orderTotal || 0;
        return sum + Math.max(0, total - paid);
    }, 0);

    return {
        totalRevenue,
        totalOrders,
        averageOrderValue,
        totalOutstanding
    };
}

function getOrdersByStatus(orders: Order[]) {
    // Show all orders including active, pending, etc.
    // Maybe exclude 'Done' if we only want active? 
    // Usually "Status Distribution" includes everything to see workload.
    const statusCount: Record<string, number> = {};

    orders.forEach(order => {
        const status = order.estado || 'Unknown';
        statusCount[status] = (statusCount[status] || 0) + 1;
    });

    return Object.entries(statusCount).map(([name, value]) => ({ name, value }));
}

function getRevenueOverTime(orders: Order[]) {
    const confirmedOrders = orders.filter(o => o.estado !== 'Cotización');
    // Group by Month (YYYY-MM)
    const revenueByMonth: Record<string, number> = {};

    confirmedOrders.forEach(order => {
        // Use fechaIngreso. If it's a timestamp, convert.
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
            revenueByMonth[key] = (revenueByMonth[key] || 0) + (order.orderTotal || 0);
        }
    });

    // Sort keys
    return Object.keys(revenueByMonth).sort().map(key => ({
        name: key,
        total: revenueByMonth[key]
    }));
}

// --- Components ---

function KPICard({ title, value, icon: Icon, subtext }: { title: string, value: string, icon: any, subtext?: string }) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    {title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
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
    const { t } = useLanguage(); // Assuming translation context exists, though we might need to add keys or just hardcode for now if keys missing.

    // Fetch all orders
    const ordersQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'orders'), orderBy('fechaIngreso', 'desc'));
    }, [firestore]);

    const { data: allOrders, isLoading, error } = useCollection<Order>(ordersQuery);

    const kpis = useMemo(() => calculateKPIs(allOrders), [allOrders]);
    const statusData = useMemo(() => getOrdersByStatus(allOrders || []), [allOrders]);
    const revenueData = useMemo(() => getRevenueOverTime(allOrders || []), [allOrders]);

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

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <KPICard
                    title="Total Revenue"
                    value={`$${kpis.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    icon={DollarSign}
                    subtext="Lifetime confirmed revenue"
                />
                <KPICard
                    title="Total Orders"
                    value={kpis.totalOrders.toString()}
                    icon={ShoppingCart}
                    subtext="Confirmed orders (excl. quotes)"
                />
                <KPICard
                    title="Average Order Value"
                    value={`$${kpis.averageOrderValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    icon={TrendingUp}
                    subtext="Revenue / Total Orders"
                />
                <KPICard
                    title="Outstanding Balance"
                    value={`$${kpis.totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    icon={DollarSign}
                    subtext="Pending payments"
                />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">

                {/* Revenue Chart */}
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Revenue Overview</CardTitle>
                        <CardDescription>Monthly revenue from orders</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={revenueData}>
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
                                        tickFormatter={(value) => `$${value}`}
                                    />
                                    <Tooltip
                                        formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                                        cursor={{ fill: 'transparent' }}
                                    />
                                    <Bar dataKey="total" fill="#0f172a" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Status Chart */}
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Order Status</CardTitle>
                        <CardDescription>Distribution of current orders</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[350px] w-full">
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
