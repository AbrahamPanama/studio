
import { PlusCircle, Search } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { OrderTable } from '@/components/orders/order-table';
import { getOrders } from '@/lib/actions';
import type { Order } from '@/lib/types';
import { StatusBadge } from '@/components/shared/status-badge';
import { Input } from '@/components/ui/input';

const groupAndSortOrders = (orders: Order[]) => {
  const statusOrder: Order['estado'][] = ['Packaging', 'Urgent', 'On Hand/Working', 'Pending', 'New', 'Cotización', 'Done'];
  
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

export default async function DashboardPage({ searchParams }: { searchParams: { query?: string } }) {
  const allOrders = await getOrders();
  const query = searchParams.query || '';

  const filteredOrders = allOrders.filter(order =>
    (order.name || '').toLowerCase().includes(query.toLowerCase()) ||
    (order.description || '').toLowerCase().includes(query.toLowerCase()) ||
    (order.orderNumber || '').toLowerCase().includes(query.toLowerCase()) ||
    order.productos.some(p => (p.name || '').toLowerCase().includes(query.toLowerCase()))
  );

  const orderGroups = groupAndSortOrders(filteredOrders);

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8">
      <Card>
        <CardHeader>
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-2xl">Orders</CardTitle>
              <CardDescription>Manage and track all customer orders.</CardDescription>
            </div>
             <div className="flex w-full max-w-sm items-center space-x-2">
              <form className="flex w-full items-center space-x-2">
                <div className="relative w-full">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input name="query" placeholder="Search orders..." className="pl-8" defaultValue={query} />
                </div>
                <Button type="submit">Search</Button>
              </form>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link href="/quotes/new">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  New Quote
                </Link>
              </Button>
              <Button asChild>
                <Link href="/orders/new">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  New Order
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          {orderGroups.map(({ status, orders }) => (
            <div key={status} className="space-y-4">
              <div className="flex items-center gap-2">
                <StatusBadge status={status} />
                <span className="text-muted-foreground">({orders.length})</span>
              </div>
              <OrderTable orders={orders} />
            </div>
          ))}
          {orderGroups.length === 0 && (
            <div className="text-center py-10">
              <p className="text-muted-foreground">No orders found.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
