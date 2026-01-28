

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
import { DatePicker } from '@/components/ui/date-picker';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';

import { orderSchema } from '@/lib/schema';
import type { Order, Tag } from '@/lib/types';
import { DELIVERY_SERVICES, ORDER_STATUSES, PRIVACY_OPTIONS } from '@/lib/constants';
import { cn, formatCurrency, formatPhoneNumber, getWhatsAppUrl, formatDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { PlusCircle, Trash2, Calculator, MessageSquare, ArrowRightLeft, Download, User, Calendar, ImageDown, Copy } from 'lucide-react';
import { TagManager } from '@/components/tags/tag-manager';
import Link from 'next/link';
import { useLanguage } from '@/contexts/language-context';
import { collection, doc, serverTimestamp, getDocs, query, orderBy } from 'firebase/firestore';

type OrderFormValues = z.infer<typeof orderSchema>;

interface OrderFormProps {
  order?: Order;
  formType: 'order' | 'quote';
}

const TAX_RATE = 0.07;

const parseDate = (dateInput: any): Date => {
  if (!dateInput) return new Date();
  if (dateInput instanceof Date) return dateInput;
  if (typeof dateInput.toDate === 'function') return dateInput.toDate(); // Firestore Timestamp
  if (dateInput.seconds) return new Date(dateInput.seconds * 1000); // Serialized Timestamp
  return new Date(dateInput); // String or number
};

const PrintableQuote = ({ data, orderNumber, isQuote, t }: { data: any, orderNumber: string, isQuote: boolean, t: any }) => {
  const subtotal = data.productos?.reduce((acc: number, p: any) => acc + (Number(p.quantity) * Number(p.price)), 0) || 0;
  const tax = data.itbms ? subtotal * 0.07 : 0;
  const total = subtotal + tax;
  const abono = total * 0.5;
  const currentDate = new Date().toLocaleDateString('es-PA', { day: '2-digit', month: '2-digit', year: 'numeric' });

  // Validity logic: 15 days from now
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 15);

  return (
    <div id="clean-quote-container" className="bg-white p-10 w-[850px] text-slate-900 font-sans leading-normal">

      {/* 1. CORPORATE HEADER */}
      <div className="flex justify-between items-start mb-2">
        <div className="space-y-1">
          <h1 className="text-xl font-extrabold text-black uppercase tracking-tight">VA Cards and Crafts</h1>
          <div className="text-sm font-medium text-slate-800 space-y-0.5">
            <p><span className="font-bold w-24 inline-block">RUC:</span> 8-825-429 DV 59</p>
            <p><span className="font-bold w-24 inline-block">Dirección:</span> Fuentes del Chase, La Chorrera, Casa C-53</p>
            <p><span className="font-bold w-24 inline-block">Teléfono:</span> 6216-8911</p>
            <p><span className="font-bold w-24 inline-block">Email:</span> vacardspanama@gmail.com</p>
          </div>
        </div>
        {/* Logo aligned right */}
        <div className="w-32 flex justify-end">
          <img src="/logo.png" alt="VA Cards Logo" className="w-24 h-auto object-contain" />
        </div>
      </div>

      {/* Heavy Corporate Divider */}
      <div className="border-b-[3px] border-black mb-6 mt-4"></div>

      {/* 2. CUSTOMER & DOCUMENT INFO */}
      <div className="flex justify-between items-start mb-8">
        {/* Left Block: Customer Info */}
        <div className="w-[60%]">
          <h3 className="font-bold text-black text-sm uppercase mb-2 border-b border-slate-300 inline-block pb-0.5">Cliente</h3>
          <div className="text-sm text-slate-700 space-y-1">
            <p className="font-bold text-lg text-black uppercase">{data.name || 'Cliente General'}</p>
            {data.companyName && <p className="text-xs font-semibold text-slate-500 uppercase">{data.companyName}</p>}
            {data.ruc && <p><span className="font-semibold text-xs text-slate-500 uppercase w-20 inline-block">RUC:</span> {data.ruc}</p>}
            {data.direccionEnvio && (
              <p className="leading-tight"><span className="font-semibold text-xs text-slate-500 uppercase w-20 inline-block">Dirección:</span> {data.direccionEnvio}</p>
            )}
            <p>
              <span className="font-semibold text-xs text-slate-500 uppercase w-20 inline-block">Teléfono:</span>
              {data.celular}
              {data.celularSecundario && ` / ${data.celularSecundario}`}
            </p>
            <p><span className="font-semibold text-xs text-slate-500 uppercase w-20 inline-block">Email:</span> {data.email}</p>
          </div>
        </div>

        {/* Right Block: Order Metadata */}
        <div className="w-[35%] text-right">
          <div className="mb-4">
            <h2 className="text-xl font-extrabold text-slate-900 uppercase tracking-wide">
              {isQuote ? 'COTIZACIÓN #' : 'ORDEN #'} <span className="text-indigo-700">{orderNumber || 'BORRADOR'}</span>
            </h2>
            <p className="text-sm font-bold text-slate-600 mt-1">FECHA: {currentDate}</p>
          </div>

          {/* Validity Box */}
          <div className="border border-black text-xs text-center ml-auto w-32">
            <div className="bg-slate-100 border-b border-black font-bold py-1">Válido hasta</div>
            <div className="py-1 font-mono">{validUntil.toLocaleDateString('es-PA')}</div>
          </div>
        </div>
      </div>

      {/* 3. ITEMS TABLE */}
      <div className="mb-8">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-black text-black">
              <th className="py-2 text-left font-bold w-[45%]">DESCRIPCIÓN</th>
              <th className="py-2 text-center font-bold">CANT.</th>
              <th className="py-2 text-right font-bold">PRECIO UNIT.</th>
              <th className="py-2 text-right font-bold">TOTAL</th>
            </tr>
          </thead>
          <tbody className="text-slate-700">
            {data.productos?.map((p: any, i: number) => (
              <tr key={i} className="border-b border-slate-200">
                <td className="py-3 pr-2">
                  <span className="font-bold block text-black">{p.name}</span>
                  <span className="text-xs text-slate-500 block mt-0.5">{p.description}</span>
                </td>
                <td className="py-3 text-center align-top pt-3">{p.quantity}</td>
                <td className="py-3 text-right align-top pt-3">${Number(p.price).toFixed(2)}</td>
                <td className="py-3 text-right font-bold text-black align-top pt-3">
                  ${(Number(p.quantity) * Number(p.price)).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 4. FINANCIAL TOTALS */}
      <div className="flex justify-end mb-12">
        <div className="w-64 space-y-1 text-sm">
          <div className="flex justify-between text-slate-600 py-1">
            <span>Subtotal:</span>
            <span className="font-medium">${subtotal.toFixed(2)}</span>
          </div>
          {data.itbms && (
            <div className="flex justify-between text-slate-600 py-1">
              <span>ITBMS (7%):</span>
              <span className="font-medium">${tax.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-extrabold text-black border-t-2 border-black pt-2 mt-2">
            <span>TOTAL:</span>
            <span>${total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold text-white bg-black p-2 mt-2">
            <span>Abono (50%):</span>
            <span>${abono.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* 5. FOOTER / TERMS */}
      <div className="border-t border-slate-300 pt-4 text-xs text-slate-500">
        <p className="font-bold text-black mb-1">Términos y Condiciones:</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Esta cotización es válida por 15 días calendario.</li>
          <li>Para iniciar el trabajo se requiere un abono del 50%.</li>
        </ul>
        <p className="mt-2"><strong>Banco General</strong> | Ahorros <strong>0405014701358</strong> Verónica de Sáenz. Enviar comprobante.</p>
      </div>
    </div>
  );
};


export function OrderForm({ order, formType }: OrderFormProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { t, language } = useLanguage();
  const [currentOrder, setCurrentOrder] = React.useState(order);
  const isEditing = !!currentOrder;
  const isQuote = formType === 'quote';
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = React.useState(false);
  const [isConverting, startConverting] = React.useState(false);
  const [allOtherTags, setAllOtherTags] = React.useState<Tag[]>([]);
  const [showPostSaveDialog, setShowPostSaveDialog] = React.useState(false);
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = React.useState(false);

  React.useEffect(() => {
    if (!firestore) return;
    const fetchTags = async () => {
      const otherTagsSnapshot = await getDocs(collection(firestore, 'tagsOther'));

      const seenOtherTagIds = new Set<string>();
      const uniqueOtherTags = otherTagsSnapshot.docs
        .map(doc => ({ ...doc.data(), id: doc.id } as Tag))
        .filter(tag => {
          if (seenOtherTagIds.has(tag.id)) {
            return false;
          } else {
            seenOtherTagIds.add(tag.id);
            return true;
          }
        });

      setAllOtherTags(uniqueOtherTags);
    };
    fetchTags();
  }, [firestore]);

  const defaultValues: Partial<OrderFormValues> = isEditing
    ? {
      ...currentOrder,
      orderNumber: currentOrder.orderNumber,
      companyName: currentOrder.companyName || '',
      entrega: parseDate(currentOrder.entrega),
      entregaLimite: parseDate(currentOrder.entregaLimite),
      description: currentOrder.description || '',
      comentarios: currentOrder.comentarios || '',
      abono: currentOrder.abono || false,
      cancelo: currentOrder.cancelo || false,
      totalAbono: currentOrder.totalAbono || 0,
      tagsOther: currentOrder.tagsOther || [],
      itbms: currentOrder.itbms || false,
      createdBy: currentOrder.createdBy,
      productos: currentOrder.productos.map(p => ({ ...p, description: p.description || '', isTaxable: p.isTaxable !== false })),
      ruc: currentOrder.ruc || '',
      celularSecundario: currentOrder.celularSecundario || '',
      direccionEnvio: currentOrder.direccionEnvio || '',
    }
    : {
      name: '',
      companyName: '',
      email: '',
      celular: '',
      celularSecundario: '',
      ruc: '',
      description: '',
      comentarios: '',
      estado: isQuote ? 'Cotización' : 'New',
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

  const handleSecondaryPhoneNumberBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const formattedNumber = formatPhoneNumber(e.target.value);
    form.setValue('celularSecundario', formattedNumber, { shouldValidate: true });
  };

  const generateCanvas = () => {
    const quoteElement = document.getElementById('clean-quote-container');
    if (!quoteElement) return Promise.reject("Quote element not found");

    return html2canvas(quoteElement, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    });
  }

  const handleDownloadQuote = () => {
    const { dismiss } = toast({ title: "Generating...", description: "Creating image..." });

    generateCanvas().then(canvas => {
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

  const handleCopyToClipboard = () => {
    const { dismiss } = toast({ title: "Generating...", description: "Copying image to clipboard..." });

    generateCanvas().then(canvas => {
      canvas.toBlob(blob => {
        if (!blob) {
          dismiss();
          toast({ variant: 'destructive', title: 'Error', description: 'Could not generate image blob.' });
          return;
        }
        if (!navigator.clipboard?.write) {
          dismiss();
          toast({ variant: 'destructive', title: 'Error', description: 'Clipboard API not supported in this browser.' });
          return;
        }

        navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]).then(() => {
          dismiss();
          toast({ title: 'Success!', description: 'Image copied to clipboard.' });
        }).catch(err => {
          dismiss();
          console.error('Clipboard write error:', err);
          toast({ variant: 'destructive', title: 'Error', description: 'Could not copy image to clipboard.' });
        });
      }, 'image/png');
    }).catch(err => {
      console.error(err);
      dismiss();
      toast({ variant: 'destructive', title: 'Error', description: 'Could not generate canvas.' });
    });
  };


  function onSubmit(data: OrderFormValues) {
    handleCalculateTotals();
    const finalValues = form.getValues();

    startTransition(async () => {
      if (!firestore) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Firestore is not initialized.',
        });
        return;
      }

      const payload: Omit<OrderFormValues, 'orderNumber'> & { [key: string]: any } = {
        ...data,
        ...finalValues
      };

      try {
        if (isEditing && currentOrder) {
          const docRef = doc(firestore, 'orders', currentOrder.id);
          updateDocumentNonBlocking(docRef, payload);
          toast({ title: t('toastSuccess'), description: t(isQuote ? 'toastQuoteUpdated' : 'toastOrderUpdated') });
          if (isQuote) {
            setShowPostSaveDialog(true); // Show dialog instead of redirecting
          } else {
            router.push('/');
          }
        } else {
          const ordersCol = collection(firestore, 'orders');
          const latestOrderQuery = query(ordersCol, orderBy('orderNumber', 'desc'));
          const latestOrderSnapshot = await getDocs(latestOrderQuery);

          let newOrderNumber = 1;
          if (!latestOrderSnapshot.empty) {
            const latestOrder = latestOrderSnapshot.docs[0].data();
            if (latestOrder.orderNumber && !isNaN(parseInt(latestOrder.orderNumber, 10))) {
              newOrderNumber = parseInt(latestOrder.orderNumber, 10) + 1;
            }
          }
          const orderNumberString = newOrderNumber.toString().padStart(6, '0');

          const newOrderData = {
            ...payload,
            createdBy: user?.email || 'Unknown',
            fechaIngreso: serverTimestamp(),
            orderNumber: orderNumberString,
          };

          const newDocRef = await addDocumentNonBlocking(ordersCol, newOrderData);
          toast({ title: t('toastSuccess'), description: t(isQuote ? 'toastQuoteCreated' : 'toastOrderCreated') });

          if (newDocRef) {
            if (isQuote) {
              const optimisticOrder: Order = {
                ...newOrderData,
                id: newDocRef.id,
                orderNumber: orderNumberString,
                fechaIngreso: new Date().toISOString(),
              };
              setCurrentOrder(optimisticOrder);
              window.history.replaceState(null, '', `/quotes/${newDocRef.id}/edit`);
              setShowPostSaveDialog(true);
            } else {
              router.push('/');
            }
          } else {
            router.push('/');
          }
        }
      } catch (error) {
        toast({
          variant: 'destructive',
          title: t('toastError'),
          description: t(isEditing ? (isQuote ? 'toastQuoteUpdateFailed' : 'toastOrderUpdateFailed') : (isQuote ? 'toastQuoteCreateFailed' : 'toastOrderCreateFailed')),
        });
      }
    });
  }

  const onInvalid = (errors: any) => {
    console.error("Form Validation Errors:", errors);
    const firstError = Object.keys(errors)[0];
    setTimeout(() => {
      toast({
        variant: 'destructive',
        title: "Validation Error",
        description: `Field '${firstError}' is invalid: ${errors[firstError]?.message || 'Unknown error'}. Check console for details.`,
      });
    }, 0);
  };

  const handleConvertToOrder = () => {
    if (!isEditing || !currentOrder || !firestore) return;

    // Check if form has unsaved changes
    if (form.formState.isDirty) {
      setShowUnsavedChangesDialog(true);
      return;
    }

    // No unsaved changes, proceed with conversion directly
    startConverting(() => {
      const docRef = doc(firestore, 'orders', currentOrder.id);
      updateDocumentNonBlocking(docRef, { estado: 'New' });
      toast({ title: t('toastSuccess'), description: t('toastQuoteConverted') });
      router.push('/');
    });
  };

  const handleSaveAndClose = () => {
    setShowUnsavedChangesDialog(false);
    handleCalculateTotals();
    const finalValues = form.getValues();
    if (!firestore || !currentOrder) return;

    startTransition(async () => {
      try {
        const docRef = doc(firestore, 'orders', currentOrder.id);
        updateDocumentNonBlocking(docRef, finalValues);
        toast({ title: t('toastSuccess'), description: t('toastQuoteUpdated') });
        router.push('/');
      } catch (error) {
        toast({ variant: 'destructive', title: t('toastError'), description: t('toastQuoteUpdateFailed') });
      }
    });
  };

  const handleSaveAndConvert = () => {
    setShowUnsavedChangesDialog(false);
    handleCalculateTotals();
    const finalValues = form.getValues();
    if (!firestore || !currentOrder) return;

    startConverting(async () => {
      try {
        const docRef = doc(firestore, 'orders', currentOrder.id);
        // Save the quote first, then convert to order
        updateDocumentNonBlocking(docRef, { ...finalValues, estado: 'New' });
        toast({ title: t('toastSuccess'), description: t('toastQuoteConverted') });
        router.push('/');
      } catch (error) {
        toast({ variant: 'destructive', title: t('toastError'), description: t('toastQuoteConvertFailed') });
      }
    });
  };

  const title = isQuote
    ? (isEditing ? t('formTitleEditQuote') : t('formTitleNewQuote'))
    : (isEditing ? t('formTitleEditOrder') : t('formTitleNewOrder'));

  const pageTitle = isEditing ? `${title}: #${currentOrder?.orderNumber}` : title;

  const translatedFormType = t(isQuote ? 'quote' : 'order');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-6">
        <div className="container mx-auto py-6">
          <div className="max-w-5xl mx-auto">
            <div id="quote-capture-area" className="bg-background p-6 rounded-lg shadow-lg">
              <div className="mb-6 flex items-start justify-between">
                <div className="flex items-center space-x-4">
                  <Image src="/logo.png" alt="VA Cards and Crafts Logo" width={60} height={60} />
                  <div>
                    <h2 className="text-2xl font-bold">VA Cards and Crafts</h2>
                    {isEditing && currentOrder?.orderNumber && (
                      <p className="text-sm text-muted-foreground">
                        {t(isQuote ? 'quote' : 'order')} #: {currentOrder.orderNumber}
                      </p>
                    )}
                    {isEditing && (
                      <div className="text-xs text-muted-foreground mt-1 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <User className="h-3 w-3" />
                          <span>{t('formCreatedBy')}: {currentOrder?.createdBy || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3" />
                          <span>{t('formCreatedOn')}: {currentOrder?.fechaIngreso ? formatDate(currentOrder.fechaIngreso as any) : 'N/A'}</span>
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
              </div>


              <div className={cn("grid gap-6", !isQuote && "lg:grid-cols-3")}>
                <div className={cn("space-y-6", !isQuote && "lg:col-span-2")}>
                  <Card>
                    <CardHeader>
                      <CardTitle>{t('formTitleCustomerInfo')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {/* Main Grid Container */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">

                        <FormField control={form.control} name="name" render={({ field }) => (
                          <FormItem><FormLabel>{t('formLabelFullName')}</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />

                        <FormField control={form.control} name="companyName" render={({ field }) => (
                          <FormItem><FormLabel>Company Name</FormLabel><FormControl><Input placeholder="Company S.A." {...field} /></FormControl><FormMessage /></FormItem>
                        )} />

                        <FormField control={form.control} name="ruc" render={({ field }) => (
                          <FormItem><FormLabel>RUC</FormLabel><FormControl><Input placeholder="8-888-888" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />

                        <FormField control={form.control} name="email" render={({ field }) => (
                          <FormItem><FormLabel>{t('formLabelEmail')}</FormLabel><FormControl><Input placeholder="email@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />

                        <div className="space-y-2">
                          <FormField control={form.control} name="celular" render={({ field }) => (
                            <FormItem><FormLabel>{t('formLabelPhone')}</FormLabel><FormControl><Input placeholder="+507 6000-0000" {...field} onBlur={handlePhoneNumberBlur} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <Button type="button" variant="outline" size="sm" className="w-full text-xs h-8" asChild disabled={!watchedPhoneNumber}>
                            <Link href={getWhatsAppUrl(watchedPhoneNumber)} target="_blank"><MessageSquare className="mr-2 h-3 w-3" /> WhatsApp</Link>
                          </Button>
                        </div>

                        <FormField control={form.control} name="celularSecundario" render={({ field }) => (
                          <FormItem><FormLabel>Secondary Phone</FormLabel><FormControl><Input placeholder="+507 6000-0000" {...field} onBlur={handleSecondaryPhoneNumberBlur} /></FormControl><FormMessage /></FormItem>
                        )} />

                        {/* NEW: Delivery Service Selection (Moved here to be visible for Quotes & Orders) */}
                        <FormField
                          control={form.control}
                          name="servicioEntrega"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('formLabelDeliveryService')}</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder={t('formPlaceholderSelectService')} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {DELIVERY_SERVICES.map((service) => (
                                    <SelectItem key={service} value={service}>
                                      {service}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* UPDATED: Shipping Address with Disable Logic */}
                        <div className="sm:col-span-2">
                          <FormField
                            control={form.control}
                            name="direccionEnvio"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t('formLabelShippingAddress')}</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="123 Main St, City, Country..."
                                    {...field}
                                    disabled={watchedServicio === 'Retiro taller'}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>{t('formTitleProducts')}</CardTitle>
                      <CardDescription>
                        {t('formDescriptionProducts').replace('{formType}', translatedFormType.toLowerCase())}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[60px] text-center p-1">{t('formTableReady')}</TableHead>
                              <TableHead className="p-2">Product Name</TableHead>
                              <TableHead className="p-2">Description</TableHead>
                              <TableHead className="w-[80px] p-2">Qty</TableHead>
                              <TableHead className="w-[100px] p-2">Unit Price</TableHead>
                              <TableHead className="w-[120px] text-right p-2">Subtotal</TableHead>
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
                                <TableCell className="p-2">
                                  <FormField control={form.control} name={`productos.${index}.name`} render={({ field }) => (
                                    <FormItem><FormControl><Input placeholder={t('formPlaceholderProductName')} {...field} /></FormControl></FormItem>
                                  )} />
                                </TableCell>
                                <TableCell className="p-2">
                                  <FormField control={form.control} name={`productos.${index}.description`} render={({ field }) => (
                                    <FormItem><FormControl><Input placeholder={t('formPlaceholderProductDesc')} {...field} /></FormControl></FormItem>
                                  )} />
                                </TableCell>
                                <TableCell className="p-2">
                                  <FormField control={form.control} name={`productos.${index}.quantity`} render={({ field }) => (
                                    <FormItem><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                                  )} />
                                </TableCell>
                                <TableCell className="p-2">
                                  <FormField control={form.control} name={`productos.${index}.price`} render={({ field }) => (
                                    <FormItem><FormControl><Input type="number" step="0.01" {...field} /></FormControl></FormItem>
                                  )} />
                                </TableCell>
                                <TableCell className="text-right font-medium p-2">
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
                          name="tagsOther"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('formLabelTagsOther')}</FormLabel>
                              <TagManager
                                allTags={allOtherTags}
                                selectedTags={field.value || []}
                                onSelectedTagsChange={field.onChange}
                                onTagsUpdate={setAllOtherTags}
                                collectionName="tagsOther"
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
              Quote # {currentOrder?.orderNumber} has been {isEditing ? 'updated' : 'created'} successfully. What would you like to do next?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className='sm:justify-between flex-col sm:flex-row gap-2'>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowPostSaveDialog(false);
                router.push('/');
              }}
            >
              Close
            </Button>
            <div className="flex justify-end gap-2">
              <Button type="button" onClick={() => {
                handleCopyToClipboard();
              }}>
                <Copy className="mr-2 h-4 w-4" />
                Copy Image
              </Button>
              <Button type="button" onClick={() => {
                handleDownloadQuote();
              }}>
                <ImageDown className="mr-2 h-4 w-4" />
                Download Image
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showUnsavedChangesDialog} onOpenChange={setShowUnsavedChangesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dialogUnsavedChangesTitle')}</DialogTitle>
            <DialogDescription>
              {t('dialogUnsavedChangesDesc')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowUnsavedChangesDialog(false)}
            >
              {t('formButtonCancel')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleSaveAndClose}
              disabled={isPending}
            >
              {t('formButtonSaveAndClose')}
            </Button>
            <Button
              type="button"
              onClick={handleSaveAndConvert}
              disabled={isConverting}
            >
              {t('formButtonSaveAndConvert')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Form>
  );
}
