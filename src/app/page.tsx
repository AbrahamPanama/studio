
'use client';

import { PlusCircle, Search, PackageOpen } from 'lucide-react'; // Añadí PackageOpen para el estado vacío
import Link from 'next/link';
import React from 'react';
import { useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card'; // Simplificado, no necesitamos Header/Title/etc para los grupos
import { OrderTable } from '@/components/orders/order-table';
import type { Order } from '@/lib/types';
import { StatusBadge } from '@/components/shared/status-badge';
import { Input } from '@/components/ui/input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/language-context';
import { cn } from '@/lib/utils';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';

// --- Helper Functions ---
const groupAndSortOrders = (orders: Order[]) => {
  const statusOrder: Order['estado'][] = ['Packaging', 'Urgent', 'On Hand/Working', 'Pending', 'New', 'Done', 'Cotización'];
  
  const grouped: Partial<Record<Order['estado'], Order[]>> = {};

  orders.forEach(order => {
    if (!grouped[order.estado]) {
      grouped[order.estado] = [];
    }
    grouped[order.estado]!.push(order);
  });

  // Convert timestamps to sortable dates
  const sortableOrders = (group: Order[] | undefined) => {
    if (!group) return [];
    return group.sort((a, b) => {
      const dateA = a.fechaIngreso && typeof a.fechaIngreso !== 'string' ? (a.fechaIngreso as any).toMillis() : 0;
      const dateB = b.fechaIngreso && typeof b.fechaIngreso !== 'string' ? (b.fechaIngreso as any).toMillis() : 0;
      return dateB - dateA;
    });
  };

  const sortedGroups = statusOrder
    .map(status => ({
      status,
      orders: sortableOrders(grouped[status]) || [],
    }))
    .filter(group => group.orders.length > 0);

  return sortedGroups;
};

const filterOrders = (orders: Order[], query: string, tab: string) => {
    const activeStatuses: Order['estado'][] = ['Packaging', 'Urgent', 'On Hand/Working', 'Pending', 'New'];

    let tabFilteredOrders = orders;
    if (tab === 'active') {
        tabFilteredOrders = orders.filter(o => activeStatuses.includes(o.estado));
    } else if (tab === 'quotes') {
        tabFilteredOrders = orders.filter(o => o.estado === 'Cotización');
    } else if (tab === 'completed') {
        tabFilteredOrders = orders.filter(o => o.estado === 'Done');
    }

    if (!query) {
        return tabFilteredOrders;
    }

    return tabFilteredOrders.filter(order => {
        const lowerCaseQuery = query.toLowerCase();
        return (
        (order.name || '').toLowerCase().includes(lowerCaseQuery) ||
        (order.description || '').toLowerCase().includes(lowerCaseQuery) ||
        (order.orderNumber || '').toLowerCase().includes(lowerCaseQuery) ||
        (order.celular || '').toLowerCase().includes(lowerCaseQuery) ||
        (order.estado || '').toLowerCase().includes(lowerCaseQuery) ||
        (order.subEstado || '').toLowerCase().includes(lowerCaseQuery) ||
        (order.tags || []).some(tag => tag.toLowerCase().includes(lowerCaseQuery)) ||
        (order.tagsOther || []).some(tag => tag.toLowerCase().includes(lowerCaseQuery)) ||
        order.productos.some(p => (p.name || '').toLowerCase().includes(lowerCaseQuery))
        );
    });
}

// --- Main Content Component ---
function DashboardPageContent({ allOrders, query, tab, onRefresh }: { allOrders: Order[], query: string, tab: string, onRefresh: () => void}) {
  const { t } = useLanguage();

  const filteredOrders = filterOrders(allOrders, query, tab);
  const orderGroups = groupAndSortOrders(filteredOrders);

  return (
    <div className="min-h-screen bg-slate-50/50 py-8 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-[95vw] mx-auto">
       <Tabs value={tab} className="space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end gap-4 px-2">
            <div className="flex-1 space-y-1">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t('orders')}</h1>
                <p className="text-muted-foreground text-lg">{t('manageOrders')}</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                 <div className="w-full sm:w-80">
                  <form className="relative" action="/">
                    <input type="hidden" name="tab" value={tab} />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                    <Input 
                        key={query} 
                        name="query" 
                        placeholder={t('searchPlaceholder')} 
                        className="pl-9 bg-white shadow-sm border-slate-200 focus-visible:ring-indigo-500" 
                        defaultValue={query} 
                    />
                    {query && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                             <Link href={`/?tab=${tab}`} className="text-xs text-muted-foreground hover:text-foreground bg-slate-100 px-2 py-1 rounded-md">
                                {t('clear')}
                             </Link>
                        </div>
                    )}
                  </form>
                </div>
                <div className="flex gap-2">
                  <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
                    <Link href="/quotes/new">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      {t('newQuote')}
                    </Link>
                  </Button>
                  <Button asChild variant="default" className="bg-indigo-600 hover:bg-indigo-700 shadow-sm">
                    <Link href="/orders/new">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      {t('newOrder')}
                    </Link>
                  </Button>
                </div>
            </div>
        </div>
        
        {/* Navigation Tabs (Con tu solución de fuerza bruta integrada y estilizada) */}
        <div className="border-b border-slate-200 px-2">
             <TabsList className="h-auto p-0 bg-transparent gap-6">
                <TabsTrigger value="active" asChild className="data-[state=active]:bg-transparent p-0">
                  <Link 
                    href="/?tab=active" 
                    className={cn(
                      "pb-3 text-sm transition-all border-b-2 px-1", 
                      tab === 'active' 
                        ? "font-bold text-indigo-600 border-indigo-600" 
                        : "font-medium text-slate-500 border-transparent hover:text-slate-700 hover:border-slate-300"
                    )}
                  >
                    {t('active')}
                  </Link>
                </TabsTrigger>
                <TabsTrigger value="quotes" asChild className="data-[state=active]:bg-transparent p-0">
                  <Link 
                    href="/?tab=quotes"
                    className={cn(
                        "pb-3 text-sm transition-all border-b-2 px-1", 
                        tab === 'quotes' 
                          ? "font-bold text-indigo-600 border-indigo-600" 
                          : "font-medium text-slate-500 border-transparent hover:text-slate-700 hover:border-slate-300"
                    )}
                  >
                    {t('quotes')}
                  </Link>
                </TabsTrigger>
                <TabsTrigger value="completed" asChild className="data-[state=active]:bg-transparent p-0">
                  <Link 
                    href="/?tab=completed" 
                    className={cn(
                        "pb-3 text-sm transition-all border-b-2 px-1", 
                        tab === 'completed' 
                          ? "font-bold text-indigo-600 border-indigo-600" 
                          : "font-medium text-slate-500 border-transparent hover:text-slate-700 hover:border-slate-300"
                    )}
                  >
                    {t('completed')}
                  </Link>
                </TabsTrigger>
            </TabsList>
        </div>

        {/* Orders Grid */}
        <div className="space-y-6">
             <TabsContent value={tab} className="mt-0 space-y-6 animate-in fade-in-50 duration-300">
                  
                  {orderGroups.map(({ status, orders }) => (
                    <div key={status} className="group">
                        <Card className="border-slate-200/60 shadow-sm hover:shadow-md transition-shadow duration-200 bg-white overflow-hidden rounded-xl">
                            <Accordion type="single" collapsible defaultValue="item-1" className="w-full">
                                <AccordionItem value="item-1" className="border-b-0">
                                <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-slate-50/50 transition-colors">
                                    <div className="flex items-center justify-between w-full pr-4">
                                        <div className="flex items-center gap-3">
                                            <StatusBadge status={status} className="shadow-none px-3 py-1 text-xs font-semibold" />
                                            <span className="text-slate-400 font-medium text-sm">
                                                {orders.length} {orders.length === 1 ? 'Pedido' : 'Pedidos'}
                                            </span>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-0 pb-0 border-t border-slate-100">
                                    <OrderTable orders={orders} onRefresh={onRefresh} />
                                </AccordionContent>
                            </AccordionItem>
                            </Accordion>
                        </Card>
                    </div>
                  ))}

                  {/* Empty State Rediseñado */}
                  {orderGroups.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
                        <div className="bg-slate-50 p-4 rounded-full mb-4">
                            <PackageOpen className="h-8 w-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900">{t('noOrders')}</h3>
                        <p className="text-sm text-muted-foreground mt-1 max-w-sm text-center">
                            No hay pedidos en esta categoría actualmente.
                        </p>
                      </div>
                  )}
            </TabsContent>
        </div>
      </Tabs>
      </div>
    </div>
  );
}

export default function DashboardPage() {
    const searchParams = useSearchParams();
    const queryParam = searchParams.get('query') || '';
    const tab = searchParams.get('tab') || 'active';
    const firestore = useFirestore();

    const [refreshKey, setRefreshKey] = React.useState(0);
    const forceRefresh = () => setRefreshKey(k => k + 1);

    const ordersQuery = useMemoFirebase(() => {
      if (!firestore) return null;
      return query(collection(firestore, 'orders'), orderBy('fechaIngreso', 'desc'));
    }, [firestore, refreshKey]);
    
    const { data: allOrders, isLoading, error } = useCollection<Order>(ordersQuery);


    if (isLoading) {
        return <div className="flex justify-center items-center h-screen bg-slate-50"><p className="text-slate-500 font-medium animate-pulse">Loading orders...</p></div>
    }

    if (error) {
        return <div className="flex justify-center items-center h-screen bg-red-50"><p className="text-red-500 font-medium">Error: {error.message}</p></div>
    }

    return <DashboardPageContent allOrders={allOrders || []} query={queryParam} tab={tab} onRefresh={forceRefresh} />;
}

    