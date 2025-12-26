
'use client';
import { useParams } from 'next/navigation';
import { OrderForm } from '@/components/orders/order-form';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Order } from '@/lib/types';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function EditQuotePage() {
  const params = useParams();
  const id = params.id as string;
  const firestore = useFirestore();

  const docRef = useMemoFirebase(() => {
    if (!firestore || !id) return null;
    return doc(firestore, 'orders', id);
  }, [firestore, id]);

  const { data: order, isLoading, error } = useDoc<Order>(docRef);

  if (isLoading) {
    return <div className="p-8">Loading quote data...</div>;
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
                <li>This quote was created in the Emulator, but you are now connected to the Cloud (or vice versa).</li>
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

  // 3. Check for incorrect type (is it an order instead of a quote?)
  if (order.estado !== 'Cotización') {
    return (
        <div className="p-8 border-l-4 border-blue-500 bg-blue-50">
            <h1 className="text-xl font-bold text-blue-700">Incorrect Document Type</h1>
            <p className="mt-2">
                This document is an <strong>Order</strong>, not a Quote.
                The code would normally redirect you to: <code className="bg-gray-200 px-1">/orders/{id}/edit</code>
            </p>
            <div className="mt-4 flex gap-4">
                <Button asChild variant="outline">
                    <Link href={`/orders/${id}/edit`}>Click here to edit it as an Order</Link>
                </Button>
                <Button onClick={() => window.history.back()}>Go Back</Button>
            </div>
        </div>
    );
  }

  // If all checks pass, render the form
  return <OrderForm order={order} formType="quote" />;
}
