
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
import { Trash2, Edit } from 'lucide-react';
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
import { ORDER_STATUSES, ORDER_SUB_STATUSES } from '@/lib/constants';
import { ProductEditPopover } from './product-edit-popover';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { TagManager } from '../tags/tag-manager';
import { Badge } from '../ui/badge';
import { useFirestore, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';

const parseDate = (dateInput: any): Date | undefined => {
  if (!dateInput) return undefined;
  // If it's already a Date object
  if (dateInput instanceof Date) return dateInput;
  // If it's a Firestore Timestamp (has toDate method)
  if (typeof dateInput.toDate === 'function') return dateInput.toDate();
  // If it's a raw object with seconds (serialized Timestamp)
  if (dateInput.seconds) return new Date(dateInput.seconds * 1000);
  // If it's a string
  return new Date(dateInput);
};


const OrderTableRow = ({
  order,
  allTags,
  allOtherTags,
  onAllTagsUpdate,
  onAllOtherTagsUpdate,
  onDelete,
  onRefresh,
}: {
  order: Order;
  allTags: Tag[];
  allOtherTags: Tag[];
  onAllTagsUpdate: (tags: Tag[]) => void;
  onAllOtherTagsUpdate: (tags: Tag[]) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}) => {
  const [isPending, startTransition] = React.useTransition();
  const { toast } = useToast();
  const firestore = useFirestore();

  const [hasMounted, setHasMounted] = React.useState(false);
  React.useEffect(() => {
    setHasMounted(true);
  }, []);

  const handleDelete = () => {
    startTransition(() => {
      const docRef = doc(firestore, 'orders', order.id);
      deleteDocumentNonBlocking(docRef);
      toast({ title: 'Success', description: 'Order will be deleted.' });
      onDelete(order.id);
      onRefresh(); // Refresh data after delete
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
        onRefresh(); // Refresh data after update
      } catch (error) {
        // Error is handled by global listener
      }
    });
  };

  const handleTagsUpdate = (tags: string[]) => {
    handleFieldUpdate('tags', tags);
  }
  const handleOtherTagsUpdate = (tags: string[]) => {
    handleFieldUpdate('tagsOther', tags);
  }

  const productSummary = order.productos.map((p, index) => (
    <span key={p.id || index} className={cn(p.materialsReady && "font-bold text-green-600")}>
      {p.name} {p.description && `(${p.description})`} - {p.quantity}
      {index < order.productos.length - 1 && ', '}
    </span>
  ));

  const orderTags = (order.tags || [])
    .map(tagId => allTags.find(t => t.id === tagId || t.label === tagId))
    .filter((t): t is Tag => !!t);
  
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
        <div className="text-sm text-muted-foreground">{order.celular}</div>
      </TableCell>
      <TableCell>
        <Select value={order.estado} onValueChange={(newStatus) => handleFieldUpdate('estado', newStatus)} disabled={isPending}>
            <SelectTrigger className="w-full border-0 focus:ring-1 focus:ring-ring p-0 h-auto bg-transparent">
                <SelectValue asChild>
                    <StatusBadge status={order.estado} className="text-sm" />
                </SelectValue>
            </SelectTrigger>
            <SelectContent>
                {ORDER_STATUSES.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
            </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Select value={order.subEstado} onValueChange={(newSubStatus) => handleFieldUpdate('subEstado', newSubStatus)} disabled={isPending || order.estado === 'Cotización'}>
            <SelectTrigger className="w-full border-0 focus:ring-1 focus:ring-ring p-0 h-auto bg-transparent capitalize">
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {ORDER_SUB_STATUSES.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
            </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <ProductEditPopover order={order} onRefresh={onRefresh}>
            <p className="cursor-pointer hover:text-primary line-clamp-3">{productSummary}</p>
        </ProductEditPopover>
      </TableCell>
      <TableCell>
        {order.servicioEntrega}
      </TableCell>
      <TableCell>
        <p className="line-clamp-3">{order.direccionEnvio}</p>
      </TableCell>
      <TableCell className={cn("hidden md:table-cell", deadlineStyle)}>
       {hasMounted && <DatePicker value={parseDate(order.entregaLimite)} onChange={(newDeadline) => handleFieldUpdate('entregaLimite', newDeadline)} disabled={isPending} />}
      </TableCell>
       <TableCell>
        <Popover>
          <PopoverTrigger asChild>
            <div className="flex flex-wrap gap-1 cursor-pointer">
              {orderTags.length > 0 ? orderTags.map(tag => (
                <Badge key={tag.id} style={{ backgroundColor: tag.color }} className="text-white">
                  {tag.label}
                </Badge>
              )) : <span className="text-muted-foreground text-xs">No tags</span>}
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-96">
            <TagManager 
              allTags={allTags}
              selectedTags={order.tags || []}
              onSelectedTagsChange={handleTagsUpdate}
              onTagsUpdate={onAllTagsUpdate}
              collectionName="tags"
            />
          </PopoverContent>
        </Popover>
      </TableCell>
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
      <TableCell className="text-right">{formatCurrency(order.orderTotal)}</TableCell>
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
    </TableRow>
  )
}

export function OrderTable({ orders: initialOrders, onRefresh }: { orders: Order[], onRefresh: () => void }) {
  const [orders, setOrders] = React.useState(initialOrders);
  const [allTags, setAllTags] = React.useState<Tag[]>([]);
  const [allOtherTags, setAllOtherTags] = React.useState<Tag[]>([]);
  const firestore = useFirestore();
  
  React.useEffect(() => {
    if (!firestore) return;
    const fetchTags = async () => {
      const tagsSnapshot = await getDocs(collection(firestore, 'tags'));
      const otherTagsSnapshot = await getDocs(collection(firestore, 'tagsOther'));
      setAllTags(tagsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Tag)));
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
  
  const handleAllTagsUpdate = (newTags: Tag[]) => {
    setAllTags(newTags);
    onRefresh();
  }

  const handleAllOtherTagsUpdate = (newTags: Tag[]) => {
    setAllOtherTags(newTags);
    onRefresh();
  }

  // --- START: Top Scrollbar Logic ---
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const [showTopScroll, setShowTopScroll] = useState(false);
  const [contentWidth, setContentWidth] = useState(0);

  useEffect(() => {
    const tableContainer = tableContainerRef.current;
    const topScroll = topScrollRef.current;

    if (!tableContainer || !topScroll) return;

    // Helper to sync scroll position
    const syncScroll = (source: HTMLElement, target: HTMLElement) => {
      // Only sync if significantly different to avoid loops
      if (Math.abs(source.scrollLeft - target.scrollLeft) > 5) {
        target.scrollLeft = source.scrollLeft;
      }
    };

    const handleTableScroll = () => syncScroll(tableContainer, topScroll);
    const handleTopScroll = () => syncScroll(topScroll, tableContainer);

    // Measure table width to size the dummy scrollbar
    const updateDimensions = () => {
      if (tableContainer) {
        const scrollWidth = tableContainer.scrollWidth;
        const clientWidth = tableContainer.clientWidth;
        
        // Only show top scrollbar if content actually overflows
        setShowTopScroll(scrollWidth > clientWidth);
        setContentWidth(scrollWidth);
      }
    };

    // Initial check
    updateDimensions();
    
    // Listen for window resize to re-check overflow
    window.addEventListener('resize', updateDimensions);

    // Attach scroll listeners
    tableContainer.addEventListener('scroll', handleTableScroll);
    topScroll.addEventListener('scroll', handleTopScroll);

    // Clean up
    return () => {
      window.removeEventListener('resize', updateDimensions);
      tableContainer.removeEventListener('scroll', handleTableScroll);
      topScroll.removeEventListener('scroll', handleTopScroll);
    };
  }, [orders]); // Re-run when data changes, as that changes width
  // --- END: Top Scrollbar Logic ---

  return (
    <div className="space-y-1"> {/* Wrapper for both bars */}
      
      {/* 1. The New Top Scrollbar */}
      {showTopScroll && (
        <div 
          ref={topScrollRef} 
          className="w-full overflow-x-auto border border-transparent"
          style={{ height: '12px' }} // Keeps it thin and unobtrusive
        >
          {/* Inner div forces the scrollbar to match table width */}
          <div style={{ width: `${contentWidth}px`, height: '1px' }} />
        </div>
      )}

      {/* 2. The Existing Table Container */}
      <div 
        ref={tableContainerRef} // <--- IMPORTANT: Attach the ref here!
        className="w-full overflow-auto max-h-[75vh] relative rounded-md border border-slate-200 shadow-sm bg-white"
      >
        <table className="w-full caption-bottom text-sm">
          {/* ... existing table header and body ... */}
          {/* (Keep all existing code inside the table tag exactly as is) */}
          <TableHeader className="sticky top-0 z-20 bg-slate-50 shadow-sm">
            <TableRow className="hover:bg-transparent border-b border-slate-300">
            <TableHead className="whitespace-nowrap min-w-[200px] bg-slate-50 font-bold text-slate-700 h-10 px-4 text-left align-middle sticky left-0 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Customer</TableHead>
            <TableHead className="whitespace-nowrap min-w-[150px] bg-slate-50 font-bold text-slate-700 h-10 px-4 text-left align-middle">Status</TableHead>
            <TableHead className="whitespace-nowrap min-w-[150px] bg-slate-50 font-bold text-slate-700 h-10 px-4 text-left align-middle">Sub-Status</TableHead>
            <TableHead className="whitespace-nowrap min-w-[250px] bg-slate-50 font-bold text-slate-700 h-10 px-4 text-left align-middle">Items</TableHead>
            <TableHead className="whitespace-nowrap min-w-[150px] bg-slate-50 font-bold text-slate-700 h-10 px-4 text-left align-middle">Shipping Method</TableHead>
            <TableHead className="whitespace-nowrap min-w-[250px] bg-slate-50 font-bold text-slate-700 h-10 px-4 text-left align-middle">Shipping Address</TableHead>
            <TableHead className="whitespace-nowrap min-w-[150px] bg-slate-50 font-bold text-slate-700 h-10 px-4 text-left align-middle">Delivery Deadline</TableHead>
            <TableHead className="whitespace-nowrap min-w-[200px] bg-slate-50 font-bold text-slate-700 h-10 px-4 text-left align-middle">Tags Shipping</TableHead>
            <TableHead className="whitespace-nowrap min-w-[200px] bg-slate-50 font-bold text-slate-700 h-10 px-4 text-left align-middle">Tags Other</TableHead>
            <TableHead className="whitespace-nowrap text-right min-w-[120px] bg-slate-50 font-bold text-slate-700 h-10 px-4 align-middle">Total</TableHead>
            <TableHead className="whitespace-nowrap min-w-[100px] bg-slate-50 font-bold text-slate-700 h-10 px-4 text-left align-middle"><span className="sr-only">Actions</span></TableHead>
          </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length > 0 ? (
            orders.map((order) => (
              <OrderTableRow 
                  key={order.id} 
                  order={order} 
                  allTags={allTags}
                  allOtherTags={allOtherTags}
                  onAllTagsUpdate={handleAllTagsUpdate}
                  onAllOtherTagsUpdate={handleAllOtherTagsUpdate}
                  onDelete={handleDelete} 
                  onRefresh={onRefresh}
              />
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">
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
