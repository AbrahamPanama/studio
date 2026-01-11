
'use client';

import { PlusCircle, Search, PackageOpen } from 'lucide-react'; // Añadí PackageOpen para el estado vacío
import Link from 'next/link';
import React from 'react';
import { useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { OrderTable } from '@/components/orders/order-table';
import type { Order } from '@/lib/types';
import { StatusBadge } from '@/components/shared/status-badge';
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
import { SearchInput } from '@/components/search-input';

// --- Helper Functions ---

// Helper: Normalizes text (lowercase + removes accents)
const normalizeText = (text: string = '') =>
  (text || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// Helper: Strips non-numeric chars
const cleanNumber = (str: string = '') => (str || '').replace(/\D/g, '');

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

const filterOrders = (orders: Order[], query: string, tab: string, excludeCompleted: boolean) => {
  
  // --- 1. SEARCH MODE (High Priority) ---
  if (query) {
    const normalizedQuery = normalizeText(query);
    const numericQuery = cleanNumber(query);
    const isNumericSearch = numericQuery.length > 0;

    // First, filter by the text query (Global Search)
    let filtered = orders.filter(order => {
      const matchesText = (field?: string | null) =>
        field ? normalizeText(field).includes(normalizedQuery) : false;

      const matchesPhone = (field?: string | null) => {
        if (!field) return false;
        return normalizeText(field).includes(normalizedQuery) ||
               (isNumericSearch && cleanNumber(field).includes(numericQuery));
      };

      return (
        matchesText(order.name) ||
        matchesText(order.description) ||
        matchesText(order.orderNumber) ||
        matchesText(order.email) ||
        matchesText(order.companyName) ||
        matchesText(order.ruc) ||
        matchesText(order.direccionEnvio) ||
        matchesText(order.estado) ||
        matchesText(order.subEstado) ||
        matchesPhone(order.celular) ||
        matchesPhone(order.celularSecundario) ||
        (order.tags || []).some(tag => matchesText(tag)) ||
        (order.tagsOther || []).some(tag => matchesText(tag)) ||
        (order.productos || []).some(p => matchesText(p.name))
      );
    });

    // Second, apply the "Exclude Completed" checkbox logic
    // If Checked (excludeCompleted = true), REMOVE 'Done' orders
    if (excludeCompleted) {
      filtered = filtered.filter(o => o.estado !== 'Done');
    }

    return filtered;
  }

  // --- 2. TAB MODE (Standard Fallback) ---
  // This only runs if there is NO search query
  const activeStatuses: Order['estado'][] = ['Packaging', 'Urgent', 'On Hand/Working', 'Pending', 'New'];

  if (tab === 'active') {
    return orders.filter(o => activeStatuses.includes(o.estado));
  } else if (tab === 'quotes') {
    return orders.filter(o => o.estado === 'Cotización');
  } else if (tab === 'completed') {
    return orders.filter(o => o.estado === 'Done');
  }

  return orders;
}

// --- Main Content Component ---
function DashboardPageContent({ 
  allOrders, 
  query, 
  tab, 
  excludeCompleted,
  onRefresh 
}: { 
  allOrders: Order[], 
  query: string, 
  tab: string, 
  excludeCompleted: boolean,
  onRefresh: () => void 
}) {
  const { t } = useLanguage();

  const filteredOrders = filterOrders(allOrders, query, tab, excludeCompleted);
  const orderGroups = groupAndSortOrders(filteredOrders);

  return (
    <div className="min-h-screen bg-slate-50/50 py-8 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-[95vw] mx-auto">
        <Tabs value={query ? '' : tab} className="space-y-8">

          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-end gap-4 px-2">
            <div className="flex-1 space-y-1">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t('orders')}</h1>
              <p className="text-muted-foreground text-lg">{t('manageOrders')}</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
              <div className="w-full sm:w-80">
                <SearchInput placeholder={t('searchPlaceholder')} />
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
          
          { !query && (
            <TabsList className="bg-transparent p-0 space-x-6 h-auto w-full justify-start border-b border-slate-200">
              {/* Active Tab */}
              <TabsTrigger value="active" asChild className="p-0 bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                <Link
                  href="/?tab=active"
                  className={cn(
                    "rounded-none border-b-[3px] border-transparent bg-transparent px-4 pb-3 pt-2 font-medium text-muted-foreground transition-colors hover:text-foreground hover:border-slate-300",
                    tab === 'active'
                      ? "border-emerald-600 font-bold text-slate-900"
                      : ""
                  )}
                >
                  {t('active')}
                </Link>
              </TabsTrigger>

              {/* Quotes Tab */}
              <TabsTrigger value="quotes" asChild className="p-0 bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                <Link
                  href="/?tab=quotes"
                  className={cn(
                    "rounded-none border-b-[3px] border-transparent bg-transparent px-4 pb-3 pt-2 font-medium text-muted-foreground transition-colors hover:text-foreground hover:border-slate-300",
                    tab === 'quotes'
                      ? "border-emerald-600 font-bold text-slate-900"
                      : ""
                  )}
                >
                  {t('quotes')}
                </Link>
              </TabsTrigger>

              {/* Completed Tab */}
              <TabsTrigger value="completed" asChild className="p-0 bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                <Link
                  href="/?tab=completed"
                  className={cn(
                    "rounded-none border-b-[3px] border-transparent bg-transparent px-4 pb-3 pt-2 font-medium text-muted-foreground transition-colors hover:text-foreground hover:border-slate-300",
                    tab === 'completed'
                      ? "border-emerald-600 font-bold text-slate-900"
                      : ""
                  )}
                >
                  {t('completed')}
                </Link>
              </TabsTrigger>
            </TabsList>
          )}

          {/* Orders Grid */}
          <div className="space-y-6">
            <div className="mt-0 space-y-6 animate-in fade-in-50 duration-300">
            
              {query && (
                <div className="px-2">
                  <h3 className="text-lg font-semibold text-slate-800">Search Results for "{query}"</h3>
                  <p className="text-sm text-muted-foreground">{filteredOrders.length} order(s) found.</p>
                </div>
              )}
            
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
                    {query ? 'Your search returned no results.' : 'No hay pedidos en esta categoría actualmente.'}
                  </p>
                </div>
              )}
            </div>
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
  const excludeCompleted = searchParams.get('excludeCompleted') !== 'false';
  
  const firestore = useFirestore();

  const [refreshKey, setRefreshKey] = React.useState(0);
  const forceRefresh = () => setRefreshKey(k => k + 1);

  const ordersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'orders'), orderBy('fechaIngreso', 'desc'));
  }, [firestore, refreshKey]);

  const { data: allOrders, isLoading, error } = useCollection<Order>(ordersQuery);


  if (isLoading && !allOrders) {
    return <div className="flex justify-center items-center h-screen bg-slate-50"><p className="text-slate-500 font-medium animate-pulse">Loading orders...</p></div>
  }

  if (error) {
    return <div className="flex justify-center items-center h-screen bg-red-50"><p className="text-red-500 font-medium">Error: {error.message}</p></div>
  }

  return <DashboardPageContent 
      allOrders={allOrders || []} 
      query={queryParam} 
      tab={tab}
      excludeCompleted={excludeCompleted}
      onRefresh={forceRefresh} 
    />;
}
