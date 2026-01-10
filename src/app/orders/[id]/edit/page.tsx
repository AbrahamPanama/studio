'use client';
import { useParams } from 'next/navigation';
import { OrderForm } from '@/components/orders/order-form';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Order } from '@/lib/types';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function EditOrderPage() {
  const params = useParams();
  const id = params.id as string;
  const firestore = useFirestore();

  const docRef = useMemoFirebase(() => {
    if (!firestore || !id) return null;
    return doc(firestore, 'orders', id);
  }, [firestore, id]);

  const { data: order, isLoading, error } = useDoc<Order>(docRef);

  if (isLoading) {
    return <div className="p-8">Loading order data...</div>;
  }

  // 1. Check for Firestore Errors (Permissions)
  if (error) {
    return (
      <div className="p-8 border-l-4 border-red-500 bg-red-50">
        <h1 className="text-xl font-bold text-red-700">Firestore Error</h1>
        <p className="mt-2 text-red-600">{error.message}</p>
        <p className="mt-2 text-sm">Check your Browser Console (F12) and Firestore Rules.</p>
      </div>
    );
  }

  // 2. Check if Data exists
  if (!order) {
    return (
      <div className="p-8 border-l-4 border-amber-500 bg-amber-50">
        <h1 className="text-xl font-bold text-amber-700">Document Not Found</h1>
        <p className="mt-2">
          The ID <strong>{id}</strong> does not exist in the "orders" collection of your current database.
        </p>
        <div className="mt-4">
          <p className="font-semibold">Possible causes:</p>
          <ul className="list-disc ml-5 mt-1">
            <li>This order was created in the Emulator, but you are now connected to the Cloud (or vice versa).</li>
            <li>The ID in the URL is wrong.</li>
          </ul>
        </div>
        <div className="mt-6">
          <Button asChild>
            <Link href="/">Return to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  // 3. Check for Redirects (without actually redirecting yet)
  if (order.estado === 'Cotización') {
    return (
      <div className="p-8 border-l-4 border-blue-500 bg-blue-50">
        <h1 className="text-xl font-bold text-blue-700">Redirect Blocked for Debugging</h1>
        <p className="mt-2">
          This is a <strong>Quote</strong> (Cotización).
          The code normally redirects you to: <code className="bg-gray-200 px-1">/quotes/{id}/edit</code>
        </p>
        <p className="mt-2">
          If you were getting a 404, it implies the <strong>/quotes</strong> route does not exist.
        </p>
        <div className="mt-4 flex gap-4">
          <Button asChild variant="outline">
            <Link href={`/quotes/${id}/edit`}>Try clicking here to go to Quotes Page manually</Link>
          </Button>
          <Button onClick={() => window.history.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <Tabs defaultValue="details" className="w-full">
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="details">Order Details</TabsTrigger>
            <TabsTrigger value="production">Production & BOM</TabsTrigger>
          </TabsList>
          <Button variant="outline" asChild size="sm">
            <Link href="/">Back to Dashboard</Link>
          </Button>
        </div>

        <TabsContent value="details">
          <OrderForm order={order} formType="order" />
        </TabsContent>

        <TabsContent value="production">
          <div className="flex justify-end mb-4">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">Manage Resource Library</Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl h-[80vh] overflow-y-auto">
                <div className="py-4">
                  <ResourceManager />
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <ProductionTab order={order} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProductionTab } from '@/components/production/production-tab';
import { ResourceManager } from '@/components/production/resource-manager';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
