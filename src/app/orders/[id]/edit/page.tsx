import { notFound } from 'next/navigation';
import { OrderForm } from '@/components/orders/order-form';
import { getOrderById } from '@/lib/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function EditOrderPage({ params }: { params: { id: string } }) {
  const order = await getOrderById(params.id);

  if (!order) {
    return notFound();
  }

  const formType = order.estado === 'Cotización' ? 'quote' : 'order';

  return <OrderForm order={order} formType={formType} />;
}
