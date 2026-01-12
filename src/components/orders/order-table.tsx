
'use client';

import * as React from 'react';
import { useRef, useEffect, useState } from 'react';
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trash2, Edit, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import Link from 'next/link';
import { differenceInDays, isPast } from 'date-fns';
import { doc, getDocs, collection } from 'firebase/firestore';

import type { Order, Tag } from '@/lib/types';
import { cn, formatCurrency } from '@/lib/utils';
import { StatusBadge } from '@/components/shared/status-badge';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { ORDER_STATUSES, PRIVACY_OPTIONS } from '@/lib/constants'; // Added PRIVACY_OPTIONS
import { ProductEditPopover } from './product-edit-popover';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { TagManager } from '../tags/tag-manager';
import { Badge } from '../ui/badge';
import { useFirestore, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';

import { ComplexityTagSelector } from '@/components/workload/complexity-tag-selector';

// --- NEW: Privacy Color Configuration ---
const PRIVACY_COLORS: Record<string, string> = {
  'Por preguntar': 'bg-amber-100 text-amber-800 border-amber-200',
  'Limitado Fecha': 'bg-orange-100 text-orange-800 border-orange-200',
  'no respondió': 'bg-slate-100 text-slate-600 border-slate-200',
  'ilimitado': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Limitado Otros': 'bg-blue-100 text-blue-800 border-blue-200',
};

const parseDate = (dateInput: any): Date | undefined => {
  if (!dateInput) return undefined;
  if (dateInput instanceof Date) return dateInput;
  if (typeof dateInput.toDate === 'function') return dateInput.toDate();
  if (dateInput.seconds) return new Date(dateInput.seconds * 1000);
  return new Date(dateInput);
};


// Define active statuses for confirmation logic
const ACTIVE_STATUSES: Order['estado'][] = ['Packaging', 'Urgent', 'On Hand/Working', 'Pending', 'New'];
const CONFIRMATION_TARGET_STATUSES: Order['estado'][] = ['Cotización', 'Done'];

const OrderTableRow = ({
  order,
  allOtherTags,
  onAllOtherTagsUpdate,
  onDelete,
  onRefresh,
  hideStatusColumn,
}: {
  order: Order;
  allOtherTags: Tag[];
  onAllOtherTagsUpdate: (tags: Tag[]) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
  hideStatusColumn?: boolean;
}) => {
  const [isPending, startTransition] = React.useTransition();
  const { toast } = useToast();
  const firestore = useFirestore();

  const [hasMounted, setHasMounted] = React.useState(false);
  React.useEffect(() => {
    setHasMounted(true);
  }, []);

  // State for status change confirmation dialog
  const [pendingStatus, setPendingStatus] = React.useState<Order['estado'] | null>(null);
  const [showStatusDialog, setShowStatusDialog] = React.useState(false);

  const handleDelete = () => {
    startTransition(() => {
      const docRef = doc(firestore, 'orders', order.id);
      deleteDocumentNonBlocking(docRef);
      toast({ title: 'Success', description: 'Order will be deleted.' });
      onDelete(order.id);
      onRefresh();
    });
  }

  const handleFieldUpdate = (fieldName: keyof Order, value: any) => {
    startTransition(() => {
      try {
        const docRef = doc(firestore, 'orders', order.id);
        updateDocumentNonBlocking(docRef, { [fieldName]: value });
        toast({
          title: 'Success',
          description: `Order ${fieldName.toString()} updated.`,
        });
        onRefresh();
      } catch (error) {
        // Error is handled by global listener
      }
    });
  };

  // Handle status change with confirmation for risky transitions
  const handleStatusChange = (newStatus: Order['estado']) => {
    const isCurrentlyActive = ACTIVE_STATUSES.includes(order.estado);
    const isTargetRisky = CONFIRMATION_TARGET_STATUSES.includes(newStatus);

    if (isCurrentlyActive && isTargetRisky) {
      // Show confirmation dialog
      setPendingStatus(newStatus);
      setShowStatusDialog(true);
    } else {
      // Direct update without confirmation
      handleFieldUpdate('estado', newStatus);
    }
  };

  const confirmStatusChange = () => {
    if (pendingStatus) {
      handleFieldUpdate('estado', pendingStatus);
      setPendingStatus(null);
      setShowStatusDialog(false);
    }
  };

  const cancelStatusChange = () => {
    setPendingStatus(null);
    setShowStatusDialog(false);
  };

  const handleOtherTagsUpdate = (tags: string[]) => {
    handleFieldUpdate('tagsOther', tags);
  }

  const copyPhoneNumber = (phone: string) => {
    let clean = phone.replace(/\D/g, '');
    if (clean.startsWith('507') && clean.length > 7)
      clean = clean.replace(/^507/, '');
    navigator.clipboard.writeText(clean);
    toast({ description: 'Phone copied: ' + clean });
  };

  const productSummary = order.productos.map((p, index) => {
    const fullText = `${p.name} ${p.description ? `(${p.description})` : ''}`;
    const truncatedText = fullText.length > 50
      ? fullText.substring(0, 50) + '...'
      : fullText;

    return (
      <span key={p.id || index} className={cn(p.materialsReady && "font-bold text-green-600")}>
        {truncatedText} - {p.quantity}
        {index < order.productos.length - 1 && ', '}
      </span>
    );
  });

  const orderOtherTags = (order.tagsOther || [])
    .map(tagId => allOtherTags.find(t => t.id === tagId || t.label === tagId))
    .filter((t): t is Tag => !!t);

  const editUrl = order.estado === 'Cotización' ? `/quotes/${order.id}/edit` : `/orders/${order.id}/edit`;

  const deadline = parseDate(order.entregaLimite);
  const deadlineStyle = React.useMemo(() => {
    if (!deadline) return '';
    if (isPast(deadline)) return 'text-red-600 font-medium';
    if (differenceInDays(deadline, new Date()) <= 3) return 'text-amber-600 font-medium';
    return '';
  }, [deadline]);

  return (
    <TableRow className="group">
      <TableCell
        className="w-[200px] sticky left-0 z-10 bg-white group-hover:bg-slate-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"
      >
        <div className="font-medium text-foreground">{order.name}</div>
        <div className="text-sm font-mono text-muted-foreground">#{order.orderNumber}</div>
        {order.celular && (
          <button
            onClick={() => copyPhoneNumber(order.celular!)}
            className="text-sm text-slate-400 hover:text-indigo-600 hover:underline text-left mt-0.5 w-fit flex items-center gap-1"
            title="Click to copy sanitized number"
          >
            {order.celular}
          </button>
        )}
      </TableCell>
      {!hideStatusColumn && (
        <TableCell className="w-[80px]">
          <Select value={order.estado} onValueChange={handleStatusChange} disabled={isPending}>
            <SelectTrigger className="w-full border-0 focus:ring-1 focus:ring-ring p-0 h-auto bg-transparent">
              <SelectValue asChild>
                <StatusBadge status={order.estado} showText={false} />
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {ORDER_STATUSES.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>
      )}
      <TableCell>
        <div className="flex items-center justify-start gap-2">
          <span>{formatCurrency(order.orderTotal)}</span>
          <ComplexityTagSelector order={order} />
        </div>
      </TableCell>
      <TableCell>
        <ProductEditPopover order={order} onRefresh={onRefresh}>
          <p className="cursor-pointer hover:text-primary line-clamp-3">{productSummary}</p>
        </ProductEditPopover>
      </TableCell>
      <TableCell className={cn("hidden md:table-cell", deadlineStyle)}>
        {hasMounted && <DatePicker value={parseDate(order.entregaLimite)} onChange={(newDeadline) => handleFieldUpdate('entregaLimite', newDeadline)} disabled={isPending} />}
      </TableCell>

      {/* --- NEW: Privacy Column --- */}
      <TableCell>
        <Select
          value={order.privacidad || 'Por preguntar'}
          onValueChange={(newVal) => handleFieldUpdate('privacidad', newVal)}
          disabled={isPending}
        >
          <SelectTrigger className="w-[130px] border-0 focus:ring-1 focus:ring-ring p-0 h-auto bg-transparent">
            <SelectValue asChild>
              <div
                className={cn(
                  "flex items-center justify-center px-2 py-1 rounded-md text-xs font-medium border cursor-pointer truncate",
                  PRIVACY_COLORS[order.privacidad || 'Por preguntar'] || 'bg-slate-100 text-slate-600 border-slate-200'
                )}
              >
                {order.privacidad || 'Por preguntar'}
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {PRIVACY_OPTIONS.map(opt => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      {/* --------------------------- */}

      <TableCell>
        <Popover>
          <PopoverTrigger asChild>
            <div className="flex flex-wrap gap-1 cursor-pointer">
              {orderOtherTags.length > 0 ? orderOtherTags.map(tag => (
                <Badge key={tag.id} style={{ backgroundColor: tag.color }} className="text-white">
                  {tag.label}
                </Badge>
              )) : <span className="text-muted-foreground text-xs">No tags</span>}
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-96">
            <TagManager
              allTags={allOtherTags}
              selectedTags={order.tagsOther || []}
              onSelectedTagsChange={handleOtherTagsUpdate}
              onTagsUpdate={onAllOtherTagsUpdate}
              collectionName="tagsOther"
            />
          </PopoverContent>
        </Popover>
      </TableCell>
      <TableCell>
        <p className="line-clamp-3">{order.direccionEnvio}</p>
      </TableCell>
      <TableCell>
        {order.servicioEntrega}
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-1">
          <Button asChild variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <Link href={editUrl}>
              <Edit className="h-4 w-4" />
              <span className="sr-only">Edit Order</span>
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Delete Order</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the order for {order.name}.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={isPending}
                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                >
                  {isPending ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>

      {/* Status Change Confirmation Dialog */}
      <AlertDialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar cambio de estado?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de cambiar el estado del pedido de <strong>{order.name}</strong> de <strong>{order.estado}</strong> a <strong>{pendingStatus}</strong>.
              {pendingStatus === 'Cotización' && ' Esto moverá el pedido a la pestaña de Cotizaciones.'}
              {pendingStatus === 'Done' && ' Esto marcará el pedido como completado.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelStatusChange}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmStatusChange} className="bg-indigo-600 hover:bg-indigo-700">
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TableRow>
  )
}

export function OrderTable({ orders: initialOrders, onRefresh, hideStatusColumn }: { orders: Order[], onRefresh: () => void, hideStatusColumn?: boolean }) {
  const [orders, setOrders] = React.useState(initialOrders);
  const [allOtherTags, setAllOtherTags] = React.useState<Tag[]>([]);
  const firestore = useFirestore();

  const [sortConfig, setSortConfig] = useState<{ key: keyof Order; direction: 'asc' | 'desc' } | null>(null);

  const sortedOrders = React.useMemo(() => {
    if (!sortConfig) return orders;

    return [...orders].sort((a, b) => {
      const key = sortConfig.key;
      let aValue = a[key];
      let bValue = b[key];

      if (key === 'entregaLimite') {
        const dateA = parseDate(aValue)?.getTime() || 0;
        const dateB = parseDate(bValue)?.getTime() || 0;
        return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      aValue = aValue ? String(aValue).toLowerCase() : '';
      bValue = bValue ? String(bValue).toLowerCase() : '';

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [orders, sortConfig]);

  const requestSort = (key: keyof Order) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ columnKey }: { columnKey: keyof Order }) => {
    if (sortConfig?.key !== columnKey) return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground/30" />;
    return sortConfig.direction === 'asc'
      ? <ArrowUp className="ml-2 h-4 w-4 text-primary" />
      : <ArrowDown className="ml-2 h-4 w-4 text-primary" />;
  };

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const [showTopScroll, setShowTopScroll] = useState(false);
  const [contentWidth, setContentWidth] = useState(0);

  useEffect(() => {
    const tableContainer = tableContainerRef.current;
    const topScroll = topScrollRef.current;

    if (!tableContainer || !topScroll) return;

    const syncScroll = (source: HTMLElement, target: HTMLElement) => {
      if (Math.abs(source.scrollLeft - target.scrollLeft) > 5) {
        target.scrollLeft = source.scrollLeft;
      }
    };

    const handleTableScroll = () => syncScroll(tableContainer, topScroll);
    const handleTopScroll = () => syncScroll(topScroll, tableContainer);

    const updateDimensions = () => {
      if (tableContainer) {
        setShowTopScroll(tableContainer.scrollWidth > tableContainer.clientWidth);
        setContentWidth(tableContainer.scrollWidth);
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    tableContainer.addEventListener('scroll', handleTableScroll);
    topScroll.addEventListener('scroll', handleTopScroll);

    return () => {
      window.removeEventListener('resize', updateDimensions);
      tableContainer.removeEventListener('scroll', handleTableScroll);
      topScroll.removeEventListener('scroll', handleTopScroll);
    };
  }, [sortedOrders]);

  React.useEffect(() => {
    if (!firestore) return;
    const fetchTags = async () => {
      const otherTagsSnapshot = await getDocs(collection(firestore, 'tagsOther'));
      setAllOtherTags(otherTagsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Tag)));
    };
    fetchTags();
  }, [firestore]);

  React.useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  const handleDelete = (id: string) => {
    setOrders(currentOrders => currentOrders.filter(o => o.id !== id));
  };

  const handleAllOtherTagsUpdate = (newTags: Tag[]) => {
    setAllOtherTags(newTags);
    onRefresh();
  }

  return (
    <div className="space-y-1">
      {showTopScroll && (
        <div ref={topScrollRef} className="w-full overflow-x-auto border border-transparent" style={{ height: '12px' }}>
          <div style={{ width: `${contentWidth}px`, height: '1' }} />
        </div>
      )}

      <div
        ref={tableContainerRef}
        className="w-full overflow-auto max-h-[calc(100vh-280px)] relative rounded-md border border-slate-200 shadow-sm bg-white"
      >
        <table className="w-full caption-bottom text-sm">
          <TableHeader className="sticky top-0 z-20 bg-slate-50 shadow-sm">
            <TableRow className="hover:bg-transparent border-b border-slate-300">

              <TableHead onClick={() => requestSort('name')} className="whitespace-nowrap min-w-[200px] bg-slate-50 font-bold text-slate-700 h-10 px-4 text-left align-middle sticky left-0 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] cursor-pointer hover:bg-slate-100 transition-colors">
                <div className="flex items-center">Customer <SortIcon columnKey="name" /></div>
              </TableHead>

              {!hideStatusColumn && (
                <TableHead onClick={() => requestSort('estado')} className="whitespace-nowrap min-w-[80px] bg-slate-50 font-bold text-slate-700 h-10 px-4 text-left align-middle cursor-pointer hover:bg-slate-100">
                  <div className="flex items-center">Status <SortIcon columnKey="estado" /></div>
                </TableHead>
              )}

              <TableHead onClick={() => requestSort('orderTotal')} className="whitespace-nowrap min-w-[200px] bg-slate-50 font-bold text-slate-700 h-10 px-4 align-middle cursor-pointer hover:bg-slate-100">
                <div className="flex items-center justify-start">Total <SortIcon columnKey="orderTotal" /></div>
              </TableHead>

              <TableHead className="whitespace-nowrap min-w-[250px] bg-slate-50 font-bold text-slate-700 h-10 px-4 text-left align-middle">
                Items
              </TableHead>

              <TableHead onClick={() => requestSort('entregaLimite')} className="whitespace-nowrap min-w-[150px] bg-slate-50 font-bold text-slate-700 h-10 px-4 text-left align-middle cursor-pointer hover:bg-slate-100">
                <div className="flex items-center">Deadline <SortIcon columnKey="entregaLimite" /></div>
              </TableHead>

              {/* --- NEW HEADER: Privacy --- */}
              <TableHead onClick={() => requestSort('privacidad')} className="whitespace-nowrap min-w-[150px] bg-slate-50 font-bold text-slate-700 h-10 px-4 text-left align-middle cursor-pointer hover:bg-slate-100">
                <div className="flex items-center">Privacy <SortIcon columnKey="privacidad" /></div>
              </TableHead>
              {/* --------------------------- */}

              <TableHead className="whitespace-nowrap min-w-[200px] bg-slate-50 font-bold text-slate-700 h-10 px-4 text-left align-middle">Tags Other</TableHead>

              <TableHead onClick={() => requestSort('direccionEnvio')} className="whitespace-nowrap min-w-[250px] bg-slate-50 font-bold text-slate-700 h-10 px-4 text-left align-middle cursor-pointer hover:bg-slate-100">
                <div className="flex items-center">Address <SortIcon columnKey="direccionEnvio" /></div>
              </TableHead>

              <TableHead onClick={() => requestSort('servicioEntrega')} className="whitespace-nowrap min-w-[150px] bg-slate-50 font-bold text-slate-700 h-10 px-4 text-left align-middle cursor-pointer hover:bg-slate-100">
                <div className="flex items-center">Method <SortIcon columnKey="servicioEntrega" /></div>
              </TableHead>

              <TableHead className="whitespace-nowrap min-w-[100px] bg-slate-50 font-bold text-slate-700 h-10 px-4 text-left align-middle"><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedOrders.length > 0 ? (
              sortedOrders.map((order) => (
                <OrderTableRow
                  key={order.id}
                  order={order}
                  allOtherTags={allOtherTags}
                  onAllOtherTagsUpdate={handleAllOtherTagsUpdate}
                  onDelete={handleDelete}
                  onRefresh={onRefresh}
                  hideStatusColumn={hideStatusColumn}
                />
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                  No orders for this view.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </table>
      </div>
    </div>
  );
}


