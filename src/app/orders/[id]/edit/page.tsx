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

  // This is a safeguard. If a quote is accessed via /orders/, redirect to /quotes/
  if (formType === 'quote') {
    const { redirect } = await import('next/navigation');
    redirect(`/quotes/${params.id}/edit`);
  }

  return <OrderForm order={order} formType={formType} />;
}
