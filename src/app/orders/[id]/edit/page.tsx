
'use client';
import { notFound, useParams } from 'next/navigation';
import { OrderForm } from '@/components/orders/order-form';
import { useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Order } from '@/lib/types';


export default function EditOrderPage() {
  const params = useParams();
  const id = params.id as string;
  const firestore = useFirestore();

  const docRef = doc(firestore, 'orders', id);
  const { data: order, isLoading } = useDoc<Order>(docRef);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!order) {
    return notFound();
  }

  const formType = order.estado === 'Cotización' ? 'quote' : 'order';

  // This is a safeguard. If a quote is accessed via /orders/, redirect to /quotes/
  if (formType === 'quote') {
    const { redirect } = require('next/navigation');
    redirect(`/quotes/${id}/edit`);
  }

  return <OrderForm order={order} formType={formType} />;
}
