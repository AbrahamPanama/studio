import { PlusCircle } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { OrderTable } from '@/components/orders/order-table';
import { getOrders } from '@/lib/actions';

export default async function DashboardPage() {
  const orders = await getOrders();

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8">
      <Card>
        <CardHeader>
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-2xl">Orders</CardTitle>
              <CardDescription>Manage and track all customer orders.</CardDescription>
            </div>
            <Button asChild>
              <Link href="/orders/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                New Order
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <OrderTable orders={orders} />
        </CardContent>
      </Card>
    </div>
  );
}
