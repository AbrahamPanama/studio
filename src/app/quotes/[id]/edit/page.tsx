
'use client';
import { notFound, useParams }from 'next/navigation';
import { OrderForm } from '@/components/orders/order-form';
import { useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Order } from '@/lib/types';


export default function EditQuotePage() {
  const params = useParams();
  const id = params.id as string;
  const firestore = useFirestore();

  const docRef = doc(firestore, 'orders', id);
  const { data: order, isLoading } = useDoc<Order>(docRef);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!order || order.estado !== 'Cotización') {
    return notFound();
  }

  return <OrderForm order={order} formType="quote" />;
}
