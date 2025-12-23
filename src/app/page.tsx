'use client';

import { PlusCircle, Search } from 'lucide-react';
import Link from 'next/link';
import React from 'react';
import { useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { OrderTable } from '@/components/orders/order-table';
import { getOrders } from '@/lib/actions';
import type { Order } from '@/lib/types';
import { StatusBadge } from '@/components/shared/status-badge';
import { Input } from '@/components/ui/input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/language-context';

const groupAndSortOrders = (orders: Order[]) => {
  const statusOrder: Order['estado'][] = ['Packaging', 'Urgent', 'On Hand/Working', 'Pending', 'New', 'Done', 'Cotización'];
  
  const grouped: Partial<Record<Order['estado'], Order[]>> = {};

  orders.forEach(order => {
    if (!grouped[order.estado]) {
      grouped[order.estado] = [];
    }
    grouped[order.estado]!.push(order);
  });

  const sortedGroups = statusOrder
    .map(status => ({
      status,
      orders: grouped[status] || [],
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

function DashboardPageContent({ allOrders, query, tab }: { allOrders: Order[], query: string, tab: string}) {
  const { t } = useLanguage();

  const filteredOrders = filterOrders(allOrders, query, tab);

  const orderGroups = groupAndSortOrders(filteredOrders);
  const defaultOpen = orderGroups.map(group => group.status);

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8">
       <Tabs value={tab}>
        <div className="flex items-end px-4 sm:px-6">
            <div className="flex-1">
                <h1 className="text-2xl font-bold tracking-tight">{t('orders')}</h1>
                <p className="text-muted-foreground">{t('manageOrders')}</p>
                 <div className="mt-4">
                    <TabsList>
                        <TabsTrigger
                          value="active"
                          asChild
                          className="tab-active-active"
                        >
                          <Link href="/?tab=active">{t('active')}</Link>
                        </TabsTrigger>
                        <TabsTrigger
                          value="quotes"
                          asChild
                          className="tab-active-quotes"
                        >
                          <Link href="/?tab=quotes">{t('quotes')}</Link>
                        </TabsTrigger>
                        <TabsTrigger
                          value="completed"
                          asChild
                          className="tab-active-completed"
                        >
                          <Link href="/?tab=completed">{t('completed')}</Link>
                        </TabsTrigger>
                    </TabsList>
                </div>
            </div>
            <div className="ml-auto flex items-center gap-4">
                 <div className="hidden w-full max-w-sm items-center space-x-2 md:flex">
                  <form className="flex w-full items-center space-x-2" action="/">
                    <input type="hidden" name="tab" value={tab} />
                    <div className="relative w-full">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input key={query} name="query" placeholder={t('searchPlaceholder')} className="pl-8" defaultValue={query} />
                    </div>
                    <Button type="submit">{t('search')}</Button>
                    {query && (
                      <Button asChild variant="outline">
                        <Link href={`/?tab=${tab}`}>{t('clear')}</Link>
                      </Button>
                    )}
                  </form>
                </div>
                <div className="flex gap-2">
                  <Button asChild variant="outline">
                    <Link href="/quotes/new">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      {t('newQuote')}
                    </Link>
                  </Button>
                  <Button asChild>
                    <Link href="/orders/new">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      {t('newOrder')}
                    </Link>
                  </Button>
                </div>
            </div>
        </div>

        <div className="mt-6 px-4 sm:px-6">
             <Tabs.Content value={tab}>
                <Card>
                    <CardContent className="pt-6">
                        <Accordion type="multiple" defaultValue={defaultOpen} className="w-full space-y-4">
                            {orderGroups.map(({ status, orders }) => (
                            <AccordionItem key={status} value={status} className="border-none">
                                <AccordionTrigger className="py-2 px-4 rounded-md transition-all hover:bg-muted/50 data-[state=open]:bg-muted/50">
                                    <div className="flex items-center gap-2">
                                        <StatusBadge status={status} className="text-base" />
                                        <span className="text-muted-foreground">({orders.length})</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="pt-4">
                                <OrderTable orders={orders} />
                                </AccordionContent>
                            </AccordionItem>
                            ))}
                        </Accordion>

                        {orderGroups.length === 0 && (
                            <div className="text-center py-10">
                            <p className="text-muted-foreground">{t('noOrders')}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </Tabs.Content>
        </div>
      </Tabs>
    </div>
  );
}


export default function DashboardPage() {
    const searchParams = useSearchParams();
    const query = searchParams.get('query') || '';
    const tab = searchParams.get('tab') || 'active';
    const [allOrders, setAllOrders] = React.useState<Order[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        getOrders().then(orders => {
            setAllOrders(orders);
            setLoading(false);
        });
    }, []);

    if (loading) {
        return <div className="flex justify-center items-center h-full"><p>Loading...</p></div>
    }

    return <DashboardPageContent allOrders={allOrders} query={query} tab={tab} />;
}
