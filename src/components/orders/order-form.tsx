
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import type { z } from 'zod';
import React from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import html2canvas from 'html2canvas';

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
import { DatePicker } from '@/components/ui/date-picker';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';

import { orderSchema } from '@/lib/schema';
import type { Order, Tag } from '@/lib/types';
import { DELIVERY_SERVICES, ORDER_STATUSES, ORDER_SUB_STATUSES, PRIVACY_OPTIONS } from '@/lib/constants';
import { cn, formatCurrency, formatPhoneNumber, getWhatsAppUrl, formatDate } from '@/lib/utils';
import { createOrder, updateOrder, getTags, updateTags, getOtherTags, updateOtherTags } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import { PlusCircle, Trash2, Calculator, MessageSquare, ArrowRightLeft, Download, User, Calendar } from 'lucide-react';
import { TagManager } from '@/components/tags/tag-manager';
import Link from 'next/link';

type OrderFormValues = z.infer<typeof orderSchema>;

const TAX_RATE = 0.07;

type OrderFormProps = {
  order?: Order;
  formType: 'order' | 'quote';
};

export function OrderForm({ order, formType }: OrderFormProps) {
  const { user } = useUser();
  const isEditing = !!order;
  const isQuote = formType === 'quote';
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();
  const [isConverting, startConverting] = React.useTransition();
  const [allTags, setAllTags] = React.useState<Tag[]>([]);
  const [allOtherTags, setAllOtherTags] = React.useState<Tag[]>([]);
  
  React.useEffect(() => {
    getTags().then(setAllTags);
    getOtherTags().then(setAllOtherTags);
  }, []);

  const defaultValues: Partial<OrderFormValues> = isEditing
    ? {
        ...order,
        orderNumber: order.orderNumber,
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
        createdBy: order.createdBy,
        productos: order.productos.map(p => ({...p, description: p.description || '', isTaxable: p.isTaxable !== false }))
      }
    : {
        name: '',
        email: '',
        celular: '',
        description: '',
        comentarios: '',
        estado: isQuote ? 'Cotización' : 'New',
        subEstado: 'Pendiente',
        entrega: new Date(),
        entregaLimite: new Date(),
        servicioEntrega: 'Retiro taller',
        direccionEnvio: 'Retiro Taller',
        privacidad: 'Por preguntar',
        productos: [{ name: '', description: '', quantity: 1, price: 0, materialsReady: false, isTaxable: true }],
        subtotal: 0,
        tax: 0,
        orderTotal: 0,
        itbms: false,
        abono: false,
        cancelo: false,
        totalAbono: 0,
        tags: [],
        tagsOther: [],
        createdBy: user?.email || undefined,
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
  
  const addEnvioItem = () => {
    append({
        name: 'Envío',
        description: 'Uno Express',
        quantity: 1,
        price: 6.50,
        materialsReady: false,
        isTaxable: false,
    });
    form.setValue('servicioEntrega', 'Uno Express', { shouldValidate: true, shouldDirty: true });
    form.setValue('direccionEnvio', '', { shouldValidate: true, shouldDirty: true });
  };

  const watchedProducts = form.watch('productos');
  const watchedItbms = form.watch('itbms');
  const watchedEntrega = form.watch('entrega');
  const watchedServicio = form.watch('servicioEntrega');
  const watchedTotalAbono = form.watch('totalAbono');
  const watchedPhoneNumber = form.watch('celular');

  // Watch the calculated fields to update the UI
  const subtotal = form.watch('subtotal');
  const tax = form.watch('tax');
  const orderTotal = form.watch('orderTotal');

  const handleCalculateTotals = React.useCallback(() => {
    const products = form.getValues('productos');
    const itbms = form.getValues('itbms');

    const newSubtotal = products.reduce((sum, product) => {
      return sum + (Number(product.quantity) || 0) * (Number(product.price) || 0);
    }, 0);
    
    const taxableSubtotal = products
      .filter(p => p.isTaxable)
      .reduce((sum, p) => sum + (Number(p.quantity) || 0) * (Number(p.price) || 0), 0);

    const newTax = itbms ? taxableSubtotal * TAX_RATE : 0;
    const newOrderTotal = newSubtotal + newTax;

    form.setValue('subtotal', newSubtotal, { shouldValidate: true, shouldDirty: true });
    form.setValue('tax', newTax, { shouldValidate: true, shouldDirty: true });
    form.setValue('orderTotal', newOrderTotal, { shouldValidate: true, shouldDirty: true });

  }, [form]);

  React.useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      if (name?.startsWith('productos') || name === 'itbms' || type === 'change') {
        handleCalculateTotals();
      }
    });
    return () => subscription.unsubscribe();
  }, [form, handleCalculateTotals]);


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
    const totalAbonoValue = Number(watchedTotalAbono) || 0;
    
    if (totalAbonoValue > 0) {
      form.setValue('abono', true, { shouldValidate: true });
    } else {
      form.setValue('abono', false, { shouldValidate: true });
    }

    const currentOrderTotal = form.getValues('orderTotal');
    if (currentOrderTotal > 0 && totalAbonoValue >= currentOrderTotal) {
      form.setValue('cancelo', true, { shouldValidate: true });
    } else {
      form.setValue('cancelo', false, { shouldValidate: true });
    }
  }, [watchedTotalAbono, form, orderTotal]);

  const handlePhoneNumberBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const formattedNumber = formatPhoneNumber(e.target.value);
    form.setValue('celular', formattedNumber, { shouldValidate: true });
  };


  function onSubmit(data: OrderFormValues) {
    // Re-calculate one last time before submitting to ensure data is accurate
    handleCalculateTotals();
    
    // We get the values after recalculating
    const finalValues = form.getValues();

    startTransition(async () => {
      try {
        const payload = {
          ...data, // original form data
          ...finalValues // updated totals
        };
        
        if (isEditing && order) {
          await updateOrder(order.id, payload);
          toast({ title: 'Success', description: `${isQuote ? 'Quote' : 'Order'} updated successfully.` });
        } else {
          await createOrder({
            ...payload,
            createdBy: user?.email || 'Unknown',
          });
          toast({ title: 'Success', description: `${isQuote ? 'Quote' : 'Order'} created successfully.` });
        }
        router.push('/');
      } catch (error) {
        console.error(error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: isEditing ? `Failed to update ${isQuote ? 'quote' : 'order'}.` : `Failed to create ${isQuote ? 'quote' : 'order'}.`,
        });
      }
    });
  }

  const handleConvertToOrder = () => {
    if (!isEditing || !order) return;

    startConverting(async () => {
      try {
        await updateOrder(order.id, { estado: 'New' });
        toast({ title: 'Success', description: 'Quote successfully converted to an order.' });
        router.push('/');
      } catch (error) {
        console.error(error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to convert quote to order.',
        });
      }
    });
  };

  const handleDownloadQuote = () => {
    const quoteElement = document.getElementById('quote-capture-area');
    if (quoteElement) {
        // Temporarily remove shadow for cleaner capture
        const originalClassName = quoteElement.className;
        quoteElement.classList.remove('shadow-lg');

        html2canvas(quoteElement, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            // These options can sometimes help with layout issues
            scrollX: 0,
            scrollY: -window.scrollY,
            windowWidth: document.documentElement.offsetWidth,
            windowHeight: document.documentElement.offsetHeight,
        }).then(canvas => {
            const link = document.createElement('a');
            link.download = `quote-${order?.orderNumber || 'new'}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();

            // Restore original class
            quoteElement.className = originalClassName;
        }).catch(err => {
            console.error("html2canvas error:", err);
             // Restore original class even if there's an error
            quoteElement.className = originalClassName;
        });
    }
  };
  
  const title = isQuote
    ? (isEditing ? `Edit Quote #${order?.orderNumber}` : 'Create New Quote')
    : (isEditing ? `Edit Order #${order?.orderNumber}` : 'Create New Order');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="container mx-auto py-10">
          
          <div id="quote-capture-area" className="bg-background p-8 rounded-lg shadow-lg">
             <div className="mb-8 flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <Image src="/logo.png" alt="VA Cards and Crafts Logo" width={60} height={60} />
                  <div>
                    <h2 className="text-2xl font-bold">VA Cards and Crafts</h2>
                     {isEditing && (
                      <div className="text-xs text-muted-foreground mt-1 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <User className="h-3 w-3" />
                          <span>Created by: {order?.createdBy || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3" />
                          <span>Created on: {order?.fechaIngreso ? formatDate(order.fechaIngreso) : 'N/A'}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isQuote && (
                    <Button type="button" variant="outline" onClick={handleDownloadQuote}>
                      <Download className="mr-2 h-4 w-4" />
                      Download Quote
                    </Button>
                  )}
                  <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                  {isEditing && isQuote && (
                    <Button type="button" variant="secondary" onClick={handleConvertToOrder} disabled={isConverting}>
                      <ArrowRightLeft className="mr-2 h-4 w-4" />
                      {isConverting ? 'Converting...' : 'Convert to Order'}
                    </Button>
                  )}
                  <Button type="submit" disabled={isPending}>
                    {isPending ? 'Saving...' : `Save ${isQuote ? 'Quote' : 'Order'}`}
                  </Button>
                </div>
            </div>
            
            <div className="mb-4">
                <h1 className="text-2xl font-bold">{title}</h1>
                {isEditing && <p className="text-sm text-muted-foreground">ID: {order?.id}</p>}
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
                    <div className="space-y-2">
                      <FormField control={form.control} name="celular" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl><Input placeholder="+507 6216-8911" {...field} onBlur={handlePhoneNumberBlur} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <Button type="button" variant="outline" size="sm" asChild className={!watchedPhoneNumber ? 'pointer-events-none opacity-50' : ''}>
                        <Link href={getWhatsAppUrl(watchedPhoneNumber)} target="_blank">
                          <MessageSquare className="mr-2 h-4 w-4" />
                          WhatsApp
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Products</CardTitle>
                    <CardDescription>Add the products for this {formType}.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50px] text-center">Ready</TableHead>
                            <TableHead>Product Name</TableHead>
                            <TableHead>Description</TableHead>
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
                                <FormField control={form.control} name={`productos.${index}.description`} render={({ field }) => (
                                  <FormItem><FormControl><Input placeholder="e.g., Color, size" {...field} /></FormControl></FormItem>
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
                    <div className="mt-4 flex gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => append({ name: '', description: '', quantity: 1, price: 0, materialsReady: false, isTaxable: true })}>
                          <PlusCircle className="mr-2 h-4 w-4" /> Add Product
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={addEnvioItem}>
                          <PlusCircle className="mr-2 h-4 w-4" /> Add Envío
                      </Button>
                    </div>
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
                              <p>Abono sugerido: {formatCurrency(orderTotal * 0.5)}</p>
                              <p className="pt-2">Nota: El costo de envío no se incluye para el cálculo de ITBMS.</p>
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
                          <div className="flex justify-between items-center font-semibold text-lg">
                              <div className="flex items-center gap-2">
                                  <Button type="button" variant="secondary" onClick={() => {
                                    handleCalculateTotals();
                                    toast({
                                        title: "Calculated",
                                        description: `New total is ${formatCurrency(form.getValues('orderTotal'))}`,
                                    });
                                  }}>
                                      <Calculator className="mr-2 h-4 w-4" />
                                      Calculate
                                  </Button>
                                  <span>Total</span>
                              </div>
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
                        <FormLabel>Description</FormLabel>
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
                {!isQuote && (
                  <>
                    <Card>
                      <CardHeader>
                        <CardTitle>Status & Logistics</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField control={form.control} name="estado" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Order Status</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
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
                            <Select onValueChange={field.onChange} value={field.value}>
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
                            <Select onValueChange={field.onChange} value={field.value}>
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
                            <Select onValueChange={field.onChange} value={field.value}>
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
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}
