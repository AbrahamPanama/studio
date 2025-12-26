
'use client';
import { notFound, useParams, redirect } from 'next/navigation';
import { OrderForm } from '@/components/orders/order-form';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Order } from '@/lib/types';


export default function EditOrderPage() {
  const params = useParams();
  const id = params.id as string;
  const firestore = useFirestore();

  const docRef = useMemoFirebase(() => {
    if (!firestore || !id) return null;
    return doc(firestore, 'orders', id);
  }, [firestore, id]);

  const { data: order, isLoading } = useDoc<Order>(docRef);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!order) {
    return notFound();
  }

  // A quote should not be editable via the /orders/... path. Redirect to the correct quotes path.
  if (order.estado === 'Cotización') {
    redirect(`/quotes/${id}/edit`);
  }

  return <OrderForm order={order} formType="order" />;
}
