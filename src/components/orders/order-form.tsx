
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from '@/components/ui/dialog';
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
import { cn, formatCurrency, formatPhoneNumber, getWhatsAppUrl, formatDate } from '@/lib/utils';
import { createOrder, updateOrder, getTags, updateTags, getOtherTags, updateOtherTags, getOrderById } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import { PlusCircle, Trash2, Calculator, MessageSquare, ArrowRightLeft, Download, User, Calendar, ImageDown } from 'lucide-react';
import { TagManager } from '@/components/tags/tag-manager';
import Link from 'next/link';
import { useLanguage } from '@/contexts/language-context';

type OrderFormValues = z.infer<typeof orderSchema>;

interface OrderFormProps {
  order?: Order;
  formType: 'order' | 'quote';
}

const TAX_RATE = 0.07;

const PrintableQuote = ({ data, orderNumber, isQuote, t }: { data: any, orderNumber: string, isQuote: boolean, t: any }) => {
  const subtotal = data.productos?.reduce((acc: number, p: any) => acc + (Number(p.quantity) * Number(p.price)), 0) || 0;
  const tax = data.itbms ? subtotal * 0.07 : 0;
  const total = subtotal + tax;

  return (
    <div id="clean-quote-container" className="bg-white p-8 w-[800px] text-slate-900 font-sans border border-slate-200">
      {/* Header */}
      <div className="flex justify-between items-start mb-8 border-b pb-6 border-slate-200">
        <div className="flex items-center gap-4">
            {/* Ensure /logo.png exists in public folder */}
            <img src="/logo.png" alt="Logo" className="w-20 h-20 object-contain" />
            <div>
                <h1 className="text-xl font-bold text-indigo-900">VA Cards and Crafts</h1>
                <p className="text-sm text-slate-500">Creando momentos inolvidables que duran toda la vida</p>
            </div>
        </div>
        <div className="text-right">
            <h2 className="text-xl font-bold text-slate-700 uppercase">{isQuote ? 'Quote' : 'Order'}</h2>
            <p className="text-slate-500 font-mono text-lg">#{orderNumber || 'DRAFT'}</p>
            <p className="text-sm text-slate-400 mt-1">{new Date().toLocaleDateString()}</p>
        </div>
      </div>

      {/* Customer Info Grid */}
      <div className="mb-8 bg-slate-50 p-4 rounded-lg">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Customer Information</h3>
        <div className="grid grid-cols-2 gap-y-4 text-sm">
            <div><span className="block text-slate-500 text-xs">Full Name</span><span className="font-semibold">{data.name || '-'}</span></div>
            <div><span className="block text-slate-500 text-xs">Email</span><span>{data.email || '-'}</span></div>
            <div><span className="block text-slate-500 text-xs">Phone</span><span>{data.celular || '-'}</span></div>
        </div>
      </div>

      {/* Products Table */}
      <div className="mb-8">
        <table className="w-full text-sm">
            <thead>
                <tr className="bg-slate-100 text-slate-700">
                    <th className="py-2 text-left pl-3 rounded-l-md">Product</th>
                    <th className="py-2 text-left">Description</th>
                    <th className="py-2 text-center">Qty</th>
                    <th className="py-2 text-right">Price</th>
                    <th className="py-2 text-right pr-3 rounded-r-md">Total</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {data.productos?.map((p: any, i: number) => (
                    <tr key={i}>
                        <td className="py-3 pl-3 font-medium">{p.name}</td>
                        <td className="py-3 text-slate-500">{p.description}</td>
                        <td className="py-3 text-center">{p.quantity}</td>
                        <td className="py-3 text-right">${Number(p.price).toFixed(2)}</td>
                        <td className="py-3 text-right pr-3 font-semibold">${(Number(p.quantity) * Number(p.price)).toFixed(2)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>

      {/* Totals Section */}
      <div className="flex justify-end mb-8">
        <div className="w-64 space-y-2">
            <div className="flex justify-between text-slate-600 text-sm"><span>Subtotal:</span><span>${subtotal.toFixed(2)}</span></div>
            {data.itbms && <div className="flex justify-between text-slate-600 text-sm"><span>ITBMS (7%):</span><span>${tax.toFixed(2)}</span></div>}
            <div className="flex justify-between text-lg font-bold text-indigo-900 border-t border-slate-200 pt-2 mt-2">
                <span>Total:</span><span>${total.toFixed(2)}</span>
            </div>
        </div>
      </div>
    </div>
  );
};


export function OrderForm({ order, formType }: OrderFormProps) {
  const { user } = useUser();
  const { t, language } = useLanguage();
  const [currentOrder, setCurrentOrder] = React.useState(order);
  const isEditing = !!currentOrder;
  const isQuote = formType === 'quote';
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();
  const [isConverting, startConverting] = React.useTransition();
  const [allTags, setAllTags] = React.useState<Tag[]>([]);
  const [allOtherTags, setAllOtherTags] = React.useState<Tag[]>([]);
  const [showPostSaveDialog, setShowPostSaveDialog] = React.useState(false);

  React.useEffect(() => {
    getTags().then(setAllTags);
    getOtherTags().then(setAllOtherTags);
  }, []);

  const defaultValues: Partial<OrderFormValues> = isEditing
    ? {
        ...currentOrder,
        orderNumber: currentOrder.orderNumber,
        entrega: currentOrder.entrega ? new Date(currentOrder.entrega) : new Date(),
        entregaLimite: currentOrder.entregaLimite ? new Date(currentOrder.entregaLimite) : new Date(),
        description: currentOrder.description || '',
        comentarios: currentOrder.comentarios || '',
        abono: currentOrder.abono || false,
        cancelo: currentOrder.cancelo || false,
        totalAbono: currentOrder.totalAbono || 0,
        tags: currentOrder.tags || [],
        tagsOther: currentOrder.tagsOther || [],
        itbms: currentOrder.itbms || false,
        createdBy: currentOrder.createdBy,
        productos: currentOrder.productos.map(p => ({...p, description: p.description || '', isTaxable: p.isTaxable !== false }))
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
  
  const watchedValues = form.watch();

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

  React.useEffect(() => {
        form.reset(defaultValues);
  }, [currentOrder, form]);

  const handlePhoneNumberBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const formattedNumber = formatPhoneNumber(e.target.value);
    form.setValue('celular', formattedNumber, { shouldValidate: true });
  };

  const handleDownloadQuote = () => {
    // Target the clean component instead of the dirty form
    const quoteElement = document.getElementById('clean-quote-container');
    if (!quoteElement) return;

    const { dismiss } = toast({ title: "Generating...", description: "Creating image..." });

    html2canvas(quoteElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
    }).then(canvas => {
        const safeName = (currentOrder?.name || 'quote').replace(/[^a-zA-Z0-9]/g, '');
        const safePhone = (currentOrder?.celular || '').replace(/[^0-9]/g, '');
        const fileName = `${isQuote ? 'Quote' : 'Order'}-${currentOrder?.orderNumber || 'draft'}-${safeName}-${safePhone}.png`;
        
        const link = document.createElement('a');
        link.download = fileName;
        link.href = canvas.toDataURL('image/png');
        link.click();
        dismiss();
    }).catch(err => {
        console.error(err);
        dismiss();
        toast({ variant: 'destructive', title: 'Error', description: 'Could not generate image.' });
    });
  };


  function onSubmit(data: OrderFormValues) {
    handleCalculateTotals();
    const finalValues = form.getValues();

    startTransition(async () => {
      try {
        const payload = {
          ...data,
          ...finalValues
        };
        
        if (isEditing && currentOrder) {
          await updateOrder(currentOrder.id, payload);
          toast({ title: t('toastSuccess'), description: t(isQuote ? 'toastQuoteUpdated' : 'toastOrderUpdated') });
          router.push('/');
        } else {
          const { id: newOrderId } = await createOrder({
            ...payload,
            createdBy: user?.email || 'Unknown',
          });
          toast({ title: t('toastSuccess'), description: t(isQuote ? 'toastQuoteCreated' : 'toastOrderCreated') });
          const newOrderData = await getOrderById(newOrderId);
          
          if (newOrderData) {
            setCurrentOrder(newOrderData);
             // Update URL without a full reload to show the dialog
            window.history.replaceState(null, '', `/quotes/${newOrderId}/edit`);
            if (isQuote) {
              setShowPostSaveDialog(true);
            }
          } else {
             // Fallback redirect if fetching fails
            const redirectUrl = isQuote ? `/quotes/${newOrderId}/edit` : `/orders/${newOrderId}/edit`;
            router.push(redirectUrl);
          }
        }
      } catch (error) {
        console.error(error);
        toast({
          variant: 'destructive',
          title: t('toastError'),
          description: t(isEditing ? (isQuote ? 'toastQuoteUpdateFailed' : 'toastOrderUpdateFailed') : (isQuote ? 'toastQuoteCreateFailed' : 'toastOrderCreateFailed')),
        });
      }
    });
  }

  const handleConvertToOrder = () => {
    if (!isEditing || !currentOrder) return;

    startConverting(async () => {
      try {
        await updateOrder(currentOrder.id, { estado: 'New' });
        toast({ title: t('toastSuccess'), description: t('toastQuoteConverted') });
        router.push('/');
      } catch (error) {
        console.error(error);
        toast({
          variant: 'destructive',
          title: t('toastError'),
          description: t('toastQuoteConvertFailed'),
        });
      }
    });
  };

  const title = isQuote
    ? (isEditing ? t('formTitleEditQuote') : t('formTitleNewQuote'))
    : (isEditing ? t('formTitleEditOrder') : t('formTitleNewOrder'));
  
  const pageTitle = isEditing ? `${title}: #${currentOrder.orderNumber}` : title;

  const translatedFormType = t(isQuote ? 'quote' : 'order');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="container mx-auto py-6">
            <div className="max-w-6xl mx-auto">
                <div id="quote-capture-area" className="bg-background p-6 rounded-lg shadow-lg">
                <div className="mb-6 flex items-start justify-between">
                    <div className="flex items-center space-x-4">
                      <Image src="/logo.png" alt="VA Cards and Crafts Logo" width={60} height={60} />
                      <div>
                        <h2 className="text-2xl font-bold">VA Cards and Crafts</h2>
                        {isEditing && (
                          <div className="text-xs text-muted-foreground mt-1 space-y-1">
                            <div className="flex items-center gap-1.5">
                              <User className="h-3 w-3" />
                              <span>{t('formCreatedBy')}: {currentOrder?.createdBy || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3 w-3" />
                              <span>{t('formCreatedOn')}: {currentOrder?.fechaIngreso ? formatDate(currentOrder.fechaIngreso) : 'N/A'}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isQuote && (
                        <Button type="button" variant="outline" onClick={handleDownloadQuote} disabled={!isEditing}>
                          <Download className="mr-2 h-4 w-4" />
                          {t('formButtonDownloadQuote')}
                        </Button>
                      )}
                      <Button type="button" variant="outline" onClick={() => router.back()}>{t('formButtonCancel')}</Button>
                      {isEditing && isQuote && (
                        <Button type="button" variant="secondary" onClick={handleConvertToOrder} disabled={isConverting}>
                          <ArrowRightLeft className="mr-2 h-4 w-4" />
                          {isConverting ? t('formButtonConverting') : t('formButtonConvertToOrder')}
                        </Button>
                      )}
                      <Button type="submit" disabled={isPending}>
                        {isPending ? t('formButtonSaving') : t(isQuote ? 'formButtonSaveQuote' : 'formButtonSaveOrder')}
                      </Button>
                    </div>
                </div>
                
                <div className="mb-4">
                  <h1 className="text-2xl font-bold">{pageTitle}</h1>
                  {isEditing && currentOrder?.orderNumber && (
                    <p className="text-sm text-muted-foreground">
                      {t(isQuote ? 'quote' : 'order')} #: {currentOrder.orderNumber}
                    </p>
                  )}
                </div>


                <div className={cn("grid gap-6", !isQuote && "lg:grid-cols-3")}>
                  <div className={cn("space-y-6", !isQuote && "lg:col-span-2")}>
                  <Card>
                    <CardHeader>
                      <CardTitle>{t('formTitleCustomerInfo')}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('formLabelFullName')}</FormLabel>
                          <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('formLabelEmail')}</FormLabel>
                          <FormControl><Input placeholder="john@example.com" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <div className="space-y-2">
                        <FormField control={form.control} name="celular" render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('formLabelPhone')}</FormLabel>
                            <FormControl><Input placeholder="+507 6216-8911" {...field} onBlur={handlePhoneNumberBlur} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <Button type="button" variant="outline" size="sm" asChild className={!watchedPhoneNumber ? 'pointer-events-none opacity-50' : ''}>
                          <Link href={getWhatsAppUrl(watchedPhoneNumber)} target="_blank">
                            <MessageSquare className="mr-2 h-4 w-4" />
                            {t('formButtonWhatsApp')}
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>{t('formTitleProducts')}</CardTitle>
                      <CardDescription>
                         {t('formDescriptionProducts', { formType: translatedFormType.toLowerCase() })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                       <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[60px] text-center p-1">{t('formTableReady')}</TableHead>
                              <TableHead className="p-1">{t('formTableProductName')}</TableHead>
                              <TableHead className="p-1">{t('formTableDescription')}</TableHead>
                              <TableHead className="w-[90px] p-1">{t('formTableQuantity')}</TableHead>
                              <TableHead className="w-[110px] p-1">{t('formTableUnitPrice')}</TableHead>
                              <TableHead className="w-[120px] text-right p-1">{t('formTableSubtotal')}</TableHead>
                              <TableHead className="w-[40px] p-1"><span className="sr-only">{t('formTableRemove')}</span></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {fields.map((item, index) => (
                              <TableRow key={item.id}>
                                <TableCell className="text-center p-1">
                                  <FormField control={form.control} name={`productos.${index}.materialsReady`} render={({ field }) => (
                                    <FormItem>
                                      <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={isQuote} /></FormControl>
                                    </FormItem>
                                  )} />
                                </TableCell>
                                <TableCell className="p-1 pr-1">
                                  <FormField control={form.control} name={`productos.${index}.name`} render={({ field }) => (
                                    <FormItem><FormControl><Input placeholder={t('formPlaceholderProductName')} {...field} /></FormControl></FormItem>
                                  )} />
                                </TableCell>
                                <TableCell className="p-1 pr-1">
                                  <FormField control={form.control} name={`productos.${index}.description`} render={({ field }) => (
                                    <FormItem><FormControl><Input placeholder={t('formPlaceholderProductDesc')} {...field} /></FormControl></FormItem>
                                  )} />
                                </TableCell>
                                <TableCell className="p-1 pr-1">
                                  <FormField control={form.control} name={`productos.${index}.quantity`} render={({ field }) => (
                                    <FormItem><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                                  )} />
                                </TableCell>
                                <TableCell className="p-1 pr-1">
                                  <FormField control={form.control} name={`productos.${index}.price`} render={({ field }) => (
                                    <FormItem><FormControl><Input type="number" step="0.01" {...field} /></FormControl></FormItem>
                                  )} />
                                </TableCell>
                                <TableCell className="text-right font-medium p-1 pr-1">
                                  {formatCurrency((watchedProducts[index]?.quantity || 0) * (watchedProducts[index]?.price || 0))}
                                </TableCell>
                                <TableCell className="p-1">
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
                            <PlusCircle className="mr-2 h-4 w-4" /> {t('formButtonAddProduct')}
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={addEnvioItem}>
                            <PlusCircle className="mr-2 h-4 w-4" /> {t('formButtonAddShipping')}
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
                                        <FormLabel className="font-normal">{t('formLabelITBMS')}</FormLabel>
                                    </FormItem>
                                )}
                            />
                            <div className="text-sm text-muted-foreground">
                                <p>{t('formTextSuggestedPayment')}: {formatCurrency(orderTotal * 0.5)}</p>
                                <p className="pt-2">{t('formTextTaxNote')}</p>
                            </div>
                          </div>
                        <div className="w-[250px] space-y-2">
                            <div className="flex justify-between">
                                <span>{t('formLabelSubtotal')}</span>
                                <span>{formatCurrency(subtotal)}</span>
                            </div>
                            {watchedItbms && (
                                <div className="flex justify-between">
                                    <span>{t('formLabelTax')}</span>
                                    <span>{formatCurrency(tax)}</span>
                                </div>
                            )}
                            <Separator />
                            <div className="flex justify-between items-center font-semibold text-lg">
                                <div className="flex items-center gap-2">
                                    <Button type="button" variant="secondary" onClick={() => {
                                      handleCalculateTotals();
                                      toast({
                                          title: t('toastCalculated'),
                                          description: t('toastNewTotal', { total: formatCurrency(form.getValues('orderTotal')) }),
                                      });
                                    }}>
                                        <Calculator className="mr-2 h-4 w-4" />
                                        {t('formButtonCalculate')}
                                    </Button>
                                    <span>{t('formLabelTotal')}</span>
                                </div>
                                <span>{formatCurrency(orderTotal)}</span>
                            </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>{t('formTitleDetails')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField control={form.control} name="description" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('formLabelDescription')}</FormLabel>
                          <FormControl><Textarea placeholder={t('formPlaceholderOrderDesc')} {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="comentarios" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('formLabelInternalComments')}</FormLabel>
                          <FormControl><Textarea placeholder={t('formPlaceholderInternalComments')} {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </CardContent>
                  </Card>
                  </div>
                  
                  {!isQuote && (
                    <div className="space-y-6">
                        <Card>
                          <CardHeader>
                            <CardTitle>{t('formTitleStatusLogistics')}</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <FormField control={form.control} name="estado" render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t('formLabelOrderStatus')}</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl><SelectTrigger><SelectValue placeholder={t('formPlaceholderSelectStatus')} /></SelectTrigger></FormControl>
                                  <SelectContent>
                                    {ORDER_STATUSES.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={form.control} name="subEstado" render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t('formLabelSubStatus')}</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl><SelectTrigger><SelectValue placeholder={t('formPlaceholderSelectSubStatus')} /></SelectTrigger></FormControl>
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
                                  <FormLabel>{t('formLabelPaidPartial')}</FormLabel>
                                </FormItem>
                              )} />
                              <FormField control={form.control} name="cancelo" render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-2 space-y-0 mt-2">
                                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            <FormLabel>{t('formLabelPaidFull')}</FormLabel>
                                </FormItem>
                              )} />
                            </div>
                            <FormField control={form.control} name="totalAbono" render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t('formLabelTotalPaid')}</FormLabel>
                                <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={form.control} name="entrega" render={({ field }) => (
                              <FormItem className="flex flex-col">
                                <FormLabel>{t('formLabelDeliveryDate')}</FormLabel>
                                <FormControl>
                                  <DatePicker value={field.value} onChange={field.onChange} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={form.control} name="entregaLimite" render={({ field }) => (
                              <FormItem className="flex flex-col">
                                <FormLabel>{t('formLabelDeliveryDeadline')}</FormLabel>
                                <FormControl>
                                  <DatePicker value={field.value} onChange={field.onChange} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={form.control} name="servicioEntrega" render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t('formLabelDeliveryService')}</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl><SelectTrigger><SelectValue placeholder={t('formPlaceholderSelectService')} /></SelectTrigger></FormControl>
                                  <SelectContent>
                                    {DELIVERY_SERVICES.map(service => <SelectItem key={service} value={service}>{service}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={form.control} name="direccionEnvio" render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t('formLabelShippingAddress')}</FormLabel>
                                <FormControl><Textarea placeholder="123 Main St..." {...field} disabled={watchedServicio === 'Retiro taller'} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle>{t('formTitleMetaData')}</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <FormField control={form.control} name="privacidad" render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t('formLabelPrivacy')}</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl><SelectTrigger><SelectValue placeholder={t('formPlaceholderSelectPrivacy')} /></SelectTrigger></FormControl>
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
                                  <FormLabel>{t('formLabelTagsShipping')}</FormLabel>
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
                                  <FormLabel>{t('formLabelTagsOther')}</FormLabel>
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
                  )}
                </div>
            </div>
          </div>
        </div>
      {/* Hidden Print View */}
      <div className="absolute left-[-9999px] top-0 overflow-hidden">
          <PrintableQuote 
              data={watchedValues} 
              orderNumber={currentOrder?.orderNumber || ''} 
              isQuote={isQuote} 
              t={t} 
          />
      </div>
      </form>
       <Dialog open={showPostSaveDialog} onOpenChange={setShowPostSaveDialog}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Quote Saved!</DialogTitle>
                    <DialogDescription>
                        Quote # {currentOrder?.orderNumber} has been created successfully. What would you like to do next?
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className='sm:justify-between'>
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">
                            Close
                        </Button>
                    </DialogClose>
                    <Button type="button" onClick={() => {
                        handleDownloadQuote();
                        setShowPostSaveDialog(false);
                    }}>
                        <ImageDown className="mr-2 h-4 w-4" />
                        Download Image
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </Form>
  );
}
