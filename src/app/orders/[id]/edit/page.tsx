
'use client';
import { notFound, useParams, redirect } from 'next/navigation';
import { OrderForm } from '@/components/orders/order-form';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Order } from '@/lib/types';
import { useEffect } from 'react';

export default function EditOrderPage() {
  const params = useParams();
  const id = params.id as string;
  const firestore = useFirestore();

  const docRef = useMemoFirebase(() => {
    if (!firestore || !id) return null;
    return doc(firestore, 'orders', id);
  }, [firestore, id]);

  const { data: order, isLoading, error } = useDoc<Order>(docRef);

  // DEBUGGING: Watch the console to see what happens
  useEffect(() => {
    if (!isLoading) {
      console.log(`[EditPage] Looking for ID: ${id}`);
      console.log(`[EditPage] Firestore Instance:`, !!firestore);
      console.log(`[EditPage] Order found:`, order);
      console.log(`[EditPage] Any Errors?:`, error);
    }
  }, [isLoading, id, order, firestore, error]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading order details...</div>;
  }

  // If the hook returns an error (like permission denied), show it instead of 404
  if (error) {
    return (
      <div className="p-8 text-red-500">
        <h2 className="font-bold text-xl">Error Loading Order</h2>
        <p>Could not fetch document with ID: {id}</p>
        <pre className="mt-4 bg-gray-100 p-4 rounded text-sm text-black">
          {JSON.stringify(error, null, 2)}
        </pre>
        <p className="mt-4 text-sm text-gray-600">Check your Browser Console (F12) for more details.</p>
      </div>
    );
  }

  if (!order) {
    // If we get here, Firestore definitely said "This document does not exist"
    return notFound();
  }

  // A quote should not be editable via the /orders/... path. Redirect to the correct quotes path.
  if (order.estado === 'Cotización') {
    redirect(`/quotes/${id}/edit`);
  }

  return <OrderForm order={order} formType="order" />;
}
