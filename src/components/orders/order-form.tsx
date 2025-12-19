'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import type { z } from 'zod';
import React from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/date-picker';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';

import { orderSchema } from '@/lib/schema';
import type { Order, Tag } from '@/lib/types';
import { DELIVERY_SERVICES, ORDER_STATUSES, ORDER_SUB_STATUSES, PRIVACY_OPTIONS } from '@/lib/constants';
import { cn, formatCurrency } from '@/lib/utils';
import { createOrder, updateOrder, getTags, updateTags, getOtherTags, updateOtherTags } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2 } from 'lucide-react';
import { TagManager } from '@/components/tags/tag-manager';

type OrderFormValues = z.infer<typeof orderSchema>;

const TAX_RATE = 0.07;

export function OrderForm({ order }: { order?: Order }) {
  const isEditing = !!order;
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();
  const [allTags, setAllTags] = React.useState<Tag[]>([]);
  const [allOtherTags, setAllOtherTags] = React.useState<Tag[]>([]);
  
  const [subtotal, setSubtotal] = React.useState(0);
  const [tax, setTax] = React.useState(0);
  const [orderTotal, setOrderTotal] = React.useState(0);

  React.useEffect(() => {
    getTags().then(setAllTags);
    getOtherTags().then(setAllOtherTags);
  }, []);

  const defaultValues: Partial<OrderFormValues> = isEditing
    ? {
        ...order,
        entrega: order.entrega ? new Date(order.entrega) : new Date(),
        entregaLimite: order.entregaLimite ? new Date(order.entregaLimite) : new Date(),
        description: order.description || '',
        comentarios: order.comentarios || '',
        abono: order.abono || false,
        cancelo: order.cancelo || false,
        totalAbono: order.totalAbono || 0,
        tags: order.tags || [],
        tagsOther: order.tagsOther || [],
        itbms: order.itbms || false,
      }
    : {
        name: '',
        email: '',
        celular: '',
        description: '',
        comentarios: '',
        estado: 'New',
        subEstado: 'Pendiente',
        entrega: new Date(),
        entregaLimite: new Date(),
        servicioEntrega: 'Retiro taller',
        direccionEnvio: 'Retiro Taller',
        privacidad: 'Por preguntar',
        productos: [{ name: '', quantity: 1, price: 0, materialsReady: false }],
        subtotal: 0,
        tax: 0,
        orderTotal: 0,
        itbms: false,
        abono: false,
        cancelo: false,
        totalAbono: 0,
        tags: [],
        tagsOther: [],
      };

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues,
    mode: 'onChange',
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'productos',
  });

  const watchedProducts = form.watch('productos');
  const watchedItbms = form.watch('itbms');
  const watchedEntrega = form.watch('entrega');
  const watchedServicio = form.watch('servicioEntrega');
  const watchedTotalAbono = form.watch('totalAbono');

  React.useEffect(() => {
    const currentSubtotal = watchedProducts.reduce((sum, product) => {
      return sum + (Number(product.quantity) || 0) * (Number(product.price) || 0);
    }, 0);
    const currentTax = watchedItbms ? currentSubtotal * TAX_RATE : 0;
    const currentTotal = currentSubtotal + currentTax;

    setSubtotal(currentSubtotal);
    setTax(currentTax);
    setOrderTotal(currentTotal);

    form.setValue('subtotal', currentSubtotal, { shouldValidate: false });
    form.setValue('tax', currentTax, { shouldValidate: false });
    form.setValue('orderTotal', currentTotal, { shouldValidate: true });
  }, [watchedProducts, watchedItbms, form]);
  
  React.useEffect(() => {
    if (isEditing && order) {
      setSubtotal(order.subtotal || 0);
      setTax(order.tax || 0);
      setOrderTotal(order.orderTotal || 0);
    }
  }, [isEditing, order]);

  React.useEffect(() => {
    if (watchedEntrega) {
      const currentLimite = form.getValues('entregaLimite');
      if (!currentLimite || isEditing === false) {
        form.setValue('entregaLimite', watchedEntrega, { shouldValidate: true });
      }
    }
  }, [watchedEntrega, form, isEditing]);

  React.useEffect(() => {
    if (watchedServicio === 'Retiro taller') {
      form.setValue('direccionEnvio', 'Retiro Taller');
    }
  }, [watchedServicio, form]);

  React.useEffect(() => {
    const totalAbono = Number(watchedTotalAbono) || 0;
    
    if (totalAbono > 0) {
      form.setValue('abono', true, { shouldValidate: true });
    } else {
      form.setValue('abono', false, { shouldValidate: true });
    }

    if (orderTotal > 0 && totalAbono >= orderTotal) {
      form.setValue('cancelo', true, { shouldValidate: true });
    } else {
      form.setValue('cancelo', false, { shouldValidate: true });
    }
  }, [watchedTotalAbono, orderTotal, form]);

  function onSubmit(data: OrderFormValues) {
    startTransition(async () => {
      try {
        // The values are already set in the form state by the useEffect hook
        const payload = data;
        
        if (isEditing && order) {
          await updateOrder(order.id, payload);
          toast({ title: 'Success', description: 'Order updated successfully.' });
        } else {
          await createOrder(payload);
          toast({ title: 'Success', description: 'Order created successfully.' });
        }
        router.push('/');
      } catch (error) {
        console.error(error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: isEditing ? 'Failed to update order.' : 'Failed to create order.',
        });
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="container mx-auto py-10">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">{isEditing ? 'Edit Order' : 'Create New Order'}</h1>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving...' : 'Save Order'}
              </Button>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle>Customer Information</CardTitle>
                </CardHeader>
                <CardContent className="grid sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl><Input placeholder="john@example.com" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="celular" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl><Input placeholder="+1 234 567 890" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Products</CardTitle>
                  <CardDescription>Add the products for this order.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px] text-center">Ready</TableHead>
                          <TableHead>Product Name</TableHead>
                          <TableHead className="w-[120px]">Quantity</TableHead>
                          <TableHead className="w-[120px]">Unit Price</TableHead>
                          <TableHead className="w-[120px] text-right">Subtotal</TableHead>
                          <TableHead className="w-[50px]"><span className="sr-only">Remove</span></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fields.map((item, index) => (
                          <TableRow key={item.id}>
                            <TableCell className="text-center">
                              <FormField control={form.control} name={`productos.${index}.materialsReady`} render={({ field }) => (
                                <FormItem>
                                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                </FormItem>
                              )} />
                            </TableCell>
                            <TableCell>
                              <FormField control={form.control} name={`productos.${index}.name`} render={({ field }) => (
                                <FormItem><FormControl><Input placeholder="e.g., T-Shirt" {...field} /></FormControl></FormItem>
                              )} />
                            </TableCell>
                            <TableCell>
                              <FormField control={form.control} name={`productos.${index}.quantity`} render={({ field }) => (
                                <FormItem><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                              )} />
                            </TableCell>
                            <TableCell>
                              <FormField control={form.control} name={`productos.${index}.price`} render={({ field }) => (
                                <FormItem><FormControl><Input type="number" step="0.01" {...field} /></FormControl></FormItem>
                              )} />
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency((watchedProducts[index]?.quantity || 0) * (watchedProducts[index]?.price || 0))}
                            </TableCell>
                            <TableCell>
                              {fields.length > 1 && (
                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <Button type="button" size="sm" variant="outline" className="mt-4" onClick={() => append({ name: '', quantity: 1, price: 0, materialsReady: false })}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Product
                  </Button>
                  <Separator className="my-6" />
                   <div className="flex justify-between items-start">
                      <div className="space-y-4">
                        <FormField
                            control={form.control}
                            name="itbms"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-2">
                                <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    <FormLabel className="font-normal">ITBMS</FormLabel>
                                </FormItem>
                            )}
                        />
                        <div className="text-sm text-muted-foreground">
                            Abono sugerido: {formatCurrency(orderTotal * 0.5)}
                        </div>
                      </div>
                    <div className="w-[250px] space-y-2">
                        <div className="flex justify-between">
                            <span>Subtotal</span>
                            <span>{formatCurrency(subtotal)}</span>
                        </div>
                         {watchedItbms && (
                            <div className="flex justify-between">
                                <span>Tax (7%)</span>
                                <span>{formatCurrency(tax)}</span>
                            </div>
                        )}
                        <Separator />
                        <div className="flex justify-between font-semibold text-lg">
                            <span>Total</span>
                            <span>{formatCurrency(orderTotal)}</span>
                        </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Order Description</FormLabel>
                      <FormControl><Textarea placeholder="Describe the order..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="comentarios" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Internal Comments</FormLabel>
                      <FormControl><Textarea placeholder="Add internal notes..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </CardContent>
              </Card>
            </div>

            <div className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle>Status & Logistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField control={form.control} name="estado" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Order Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select a status" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {ORDER_STATUSES.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="subEstado" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sub-Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select a sub-status" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {ORDER_SUB_STATUSES.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                   <div className="flex space-x-4">
                    <FormField control={form.control} name="abono" render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 space-y-0 mt-2">
                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        <FormLabel>Abonó</FormLabel>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="cancelo" render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 space-y-0 mt-2">
                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        <FormLabel>Canceló</FormLabel>
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="totalAbono" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Abono</FormLabel>
                      <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="entrega" render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Delivery Date (Entrega)</FormLabel>
                      <FormControl>
                        <DatePicker value={field.value} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="entregaLimite" render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Delivery Deadline (Entrega Límite)</FormLabel>
                      <FormControl>
                         <DatePicker value={field.value} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="servicioEntrega" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delivery Service</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select a service" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {DELIVERY_SERVICES.map(service => <SelectItem key={service} value={service}>{service}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                   <FormField control={form.control} name="direccionEnvio" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shipping Address</FormLabel>
                      <FormControl><Textarea placeholder="123 Main St..." {...field} disabled={watchedServicio === 'Retiro taller'} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </CardContent>
              </Card>

               <Card>
                <CardHeader>
                  <CardTitle>Meta Data</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField control={form.control} name="privacidad" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Privacy</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select privacy option" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {PRIVACY_OPTIONS.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField
                    control={form.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tags Shipping</FormLabel>
                        <TagManager
                          allTags={allTags}
                          selectedTags={field.value || []}
                          onSelectedTagsChange={field.onChange}
                          onTagsUpdate={setAllTags}
                          onSave={updateTags}
                        />
                         <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tagsOther"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tags Other</FormLabel>
                        <TagManager
                          allTags={allOtherTags}
                          selectedTags={field.value || []}
                          onSelectedTagsChange={field.onChange}
                          onTagsUpdate={setAllOtherTags}
                          onSave={updateOtherTags}
                        />
                         <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}
