

'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Edit } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { differenceInDays, isPast } from 'date-fns';

import type { Order, Tag } from '@/lib/types';
import { cn, formatCurrency } from '@/lib/utils';
import { StatusBadge } from '@/components/shared/status-badge';
import { deleteOrder, updateOrder, getTags, getOtherTags, updateTags, updateOtherTags } from '@/lib/actions';
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

const OrderTableRow = ({ 
  order, 
  allTags, 
  allOtherTags, 
  onAllTagsUpdate, 
  onAllOtherTagsUpdate, 
  onDelete,
}: { 
  order: Order, 
  allTags: Tag[], 
  allOtherTags: Tag[], 
  onAllTagsUpdate: (tags: Tag[]) => void, 
  onAllOtherTagsUpdate: (tags: Tag[]) => void, 
  onDelete: (id: string) => void,
}) => {
  const [isPending, startTransition] = React.useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const [name, setName] = React.useState(order.name);
  
  const [hasMounted, setHasMounted] = React.useState(false);
  React.useEffect(() => {
    setHasMounted(true);
  }, []);

  const handleDelete = () => {
    startTransition(async () => {
      await deleteOrder(order.id);
      toast({ title: 'Success', description: 'Order deleted.' });
      onDelete(order.id); // This will trigger the refresh on the parent
    });
  }

  const handleFieldUpdate = (fieldName: keyof Order, value: any) => {
    startTransition(async () => {
      try {
        await updateOrder(order.id, { [fieldName]: value });
        toast({
          title: 'Success',
          description: `Order ${fieldName.toString()} updated.`,
        });
        router.refresh();
      } catch (error) {
        console.error(error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: `Failed to update ${fieldName.toString()}.`,
        });
      }
    });
  };

  const handleTagsUpdate = (tags: string[]) => {
    handleFieldUpdate('tags', tags);
  }
  const handleOtherTagsUpdate = (tags: string[]) => {
    handleFieldUpdate('tagsOther', tags);
  }

  const handleNameBlur = () => {
    if (name !== order.name) {
      handleFieldUpdate('name', name);
    }
  };
  
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

  const deadline = order.entregaLimite ? new Date(order.entregaLimite) : null;
  const deadlineStyle = React.useMemo(() => {
    if (!deadline) return '';
    if (isPast(deadline)) return 'text-red-600 font-medium';
    if (differenceInDays(deadline, new Date()) <= 3) return 'text-amber-600 font-medium';
    return '';
  }, [deadline]);

  return (
    <TableRow>
      <TableCell className="w-[200px]">
        <div className="font-medium text-foreground">{name}</div>
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
        <ProductEditPopover order={order}>
            <p className="cursor-pointer hover:text-primary line-clamp-3">{productSummary}</p>
        </ProductEditPopover>
      </TableCell>
      <TableCell>
        {order.servicioEntrega}
      </TableCell>
      <TableCell>
        <p className="line-clamp-3">{order.direccionEnvio}</p>
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
              onSave={updateTags}
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
              onSave={updateOtherTags}
            />
          </PopoverContent>
        </Popover>
      </TableCell>
      <TableCell className={cn("hidden md:table-cell", deadlineStyle)}>
       {hasMounted && <DatePicker value={order.entregaLimite ? new Date(order.entregaLimite) : undefined} onChange={(newDeadline) => handleFieldUpdate('entregaLimite', newDeadline)} disabled={isPending} />}
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

const ResizableHandle = ({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) => (
  <div
    className="absolute top-0 right-0 h-full w-2 cursor-col-resize z-10 select-none"
    onMouseDown={onMouseDown}
  >
    <div className="w-px h-full bg-border/50 group-hover:bg-primary transition-colors" />
  </div>
);


const COLUMN_IDS = ['customer', 'status', 'sub-status', 'items', 'shipping-method', 'shipping-address', 'tags-shipping', 'tags-other', 'delivery-deadline', 'total', 'actions'];

export function OrderTable({ orders: initialOrders, onRefresh }: { orders: Order[], onRefresh: () => void }) {
  const [orders, setOrders] = React.useState(initialOrders);
  const [allTags, setAllTags] = React.useState<Tag[]>([]);
  const [allOtherTags, setAllOtherTags] = React.useState<Tag[]>([]);
  
  const [columnWidths, setColumnWidths] = React.useState<Record<string, number>>({});
  const tableRef = React.useRef<HTMLTableElement>(null);
  const isResizing = React.useRef<number | null>(null);
  const router = useRouter();

  React.useEffect(() => {
    // Load widths from localStorage
    const savedWidths = localStorage.getItem('orderTableColumnWidths');
    if (savedWidths) {
      setColumnWidths(JSON.parse(savedWidths));
    } else {
        // Set default widths if none are saved
        const defaultWidths: Record<string, number> = {
            'customer': 200,
            'status': 160,
            'sub-status': 160,
            'items': 250,
            'shipping-method': 150,
            'shipping-address': 250,
            'tags-shipping': 250,
            'tags-other': 250,
            'delivery-deadline': 150,
            'total': 120,
            'actions': 100,
        };
        setColumnWidths(defaultWidths);
    }
  }, []);

  const saveWidths = (widths: Record<string, number>) => {
    localStorage.setItem('orderTableColumnWidths', JSON.stringify(widths));
  };

  const handleMouseDown = React.useCallback((index: number) => (e: React.MouseEvent) => {
    isResizing.current = index;
    e.preventDefault();
  }, []);

  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (isResizing.current === null || !tableRef.current) return;
    
    const ths = tableRef.current.querySelectorAll('th');
    const th = ths[isResizing.current];
    if (!th) return;

    const newWidth = e.clientX - th.getBoundingClientRect().left;
    if (newWidth > 50) { // minimum width
      setColumnWidths(prev => {
        const newWidths = { ...prev, [COLUMN_IDS[isResizing.current as number]]: newWidth };
        saveWidths(newWidths);
        return newWidths;
      });
    }
  }, []);

  const handleMouseUp = React.useCallback(() => {
    isResizing.current = null;
  }, []);

  React.useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);


  React.useEffect(() => {
    getTags().then(setAllTags);
    getOtherTags().then(setAllOtherTags);
  }, []);
  
  React.useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  const handleDelete = (id: string) => {
    // Optimistically remove the order from the local state
    setOrders(currentOrders => currentOrders.filter(o => o.id !== id));
    // Trigger the parent component to refetch all data
    onRefresh();
  };
  
  const handleAllTagsUpdate = (newTags: Tag[]) => {
    setAllTags(newTags);
    router.refresh();
  }

  const handleAllOtherTagsUpdate = (newTags: Tag[]) => {
    setAllOtherTags(newTags);
    router.refresh();
  }

  return (
    <div className="w-full overflow-x-auto">
      <Table ref={tableRef} style={{ tableLayout: 'fixed' }}>
        <colgroup>
          {COLUMN_IDS.map(id => (
            <col key={id} style={{ width: columnWidths[id] ? `${columnWidths[id]}px` : undefined }} />
          ))}
        </colgroup>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {COLUMN_IDS.map((id, index) => (
              <TableHead key={id} className="group relative whitespace-nowrap">
                <span className="capitalize">{id.replace(/-/g, ' ')}</span>
                {index < COLUMN_IDS.length - 1 && <ResizableHandle onMouseDown={handleMouseDown(index)} />}
              </TableHead>
            ))}
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
              />
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={COLUMN_IDS.length} className="h-24 text-center">
                No orders for this view.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
