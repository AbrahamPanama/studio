import { notFound } from 'next/navigation';
import { OrderForm } from '@/components/orders/order-form';
import { getOrderById } from '@/lib/actions';

export default async function EditQuotePage({ params }: { params: { id: string } }) {
  const order = await getOrderById(params.id);

  if (!order || order.estado !== 'Cotización') {
    return notFound();
  }

  return <OrderForm order={order} formType="quote" />;
}
