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

import type { Order, Tag } from '@/lib/types';
import { cn, formatCurrency } from '@/lib/utils';
import { StatusBadge } from '@/components/shared/status-badge';
import { deleteOrder, updateOrder, getTags } from '@/lib/actions';
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
import { DatePicker } from '@/components/date-picker';
import { ORDER_STATUSES, ORDER_SUB_STATUSES } from '@/lib/constants';
import { ProductEditPopover } from './product-edit-popover';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { TagManager } from '../tags/tag-manager';
import { Badge } from '../ui/badge';

const OrderTableRow = ({ order, allTags, onAllTagsUpdate, onDelete }: { order: Order, allTags: Tag[], onAllTagsUpdate: (tags: Tag[]) => void, onDelete: (id: string) => void }) => {
  const [isPending, startTransition] = React.useTransition();
  const { toast } = useToast();

  const [name, setName] = React.useState(order.name);
  const [status, setStatus] = React.useState(order.estado);
  const [subStatus, setSubStatus] = React.useState(order.subEstado);
  const [deliveryDeadline, setDeliveryDeadline] = React.useState<Date | undefined>(
    order.entregaLimite ? new Date(order.entregaLimite) : undefined
  );
  
  const [hasMounted, setHasMounted] = React.useState(false);
  React.useEffect(() => {
    setHasMounted(true);
  }, []);

  const handleDelete = () => {
    startTransition(async () => {
      onDelete(order.id);
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
      } catch (error) {
        console.error(error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: `Failed to update ${fieldName.toString()}.`,
        });
        // Revert optimistic updates on failure
        if (fieldName === 'name') setName(order.name);
        if (fieldName === 'estado') setStatus(order.estado);
        if (fieldName === 'subEstado') setSubStatus(order.subEstado);
        if (fieldName === 'entregaLimite') setDeliveryDeadline(order.entregaLimite ? new Date(order.entregaLimite) : undefined);
      }
    });
  };

  const handleTagsUpdate = (tags: string[]) => {
    handleFieldUpdate('tags', tags);
  }

  const handleNameBlur = () => {
    if (name !== order.name) {
      handleFieldUpdate('name', name);
    }
  };

  const handleStatusChange = (newStatus: Order['estado']) => {
    setStatus(newStatus);
    handleFieldUpdate('estado', newStatus);
  };
  
  const handleSubStatusChange = (newSubStatus: Order['subEstado']) => {
    setSubStatus(newSubStatus);
    handleFieldUpdate('subEstado', newSubStatus);
  };

  const handleDeadlineChange = (newDeadline: Date | undefined) => {
    if (newDeadline) {
        setDeliveryDeadline(newDeadline);
        handleFieldUpdate('entregaLimite', newDeadline);
    }
  }

  const productSummary = order.productos.map((p, index) => (
    <span key={p.id || index} className={cn(p.materialsReady && "font-bold text-green-600")}>
      {p.name} - {p.quantity}
      {index < order.productos.length - 1 && ', '}
    </span>
  ));

  const orderTags = (order.tags || [])
    .map(tagId => allTags.find(t => t.id === tagId || t.label === tagId))
    .filter((t): t is Tag => !!t);


  return (
    <TableRow>
      <TableCell className="w-[200px]">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleNameBlur}
          className="font-medium border-0 focus-visible:ring-1 focus-visible:ring-ring"
          disabled={isPending}
        />
        <div className="text-sm text-muted-foreground flex items-center">
          {order.celular}
        </div>
      </TableCell>
      <TableCell className="w-[160px]">
        <Select value={status} onValueChange={handleStatusChange} disabled={isPending}>
            <SelectTrigger className="w-full border-0 focus:ring-1 focus:ring-ring p-0 h-auto bg-transparent">
                <SelectValue asChild>
                    <StatusBadge status={status} />
                </SelectValue>
            </SelectTrigger>
            <SelectContent>
                {ORDER_STATUSES.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
            </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="w-[160px]">
        <Select value={subStatus} onValueChange={handleSubStatusChange} disabled={isPending}>
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
            <p className="line-clamp-3 cursor-pointer hover:text-primary">{productSummary}</p>
        </ProductEditPopover>
      </TableCell>
       <TableCell className="max-w-[250px]">
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
            />
          </PopoverContent>
        </Popover>
      </TableCell>
      <TableCell className="hidden md:table-cell w-[120px]">
       {hasMounted && <DatePicker value={deliveryDeadline} onChange={handleDeadlineChange} disabled={isPending} />}
      </TableCell>
      <TableCell className="text-right w-[120px]">{formatCurrency(order.orderTotal)}</TableCell>
      <TableCell className="w-[100px]">
        <div className="flex items-center justify-end gap-2">
            <Button asChild variant="ghost" size="icon">
                <Link href={`/orders/${order.id}/edit`}>
                <Edit className="h-4 w-4" />
                <span className="sr-only">Edit Order</span>
                </Link>
            </Button>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
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


export function OrderTable({ orders }: { orders: Order[] }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const { toast } = useToast();
  
  const [allTags, setAllTags] = React.useState<Tag[]>([]);
  const searchTerm = searchParams.get('query')?.toString() || '';
  const [inputValue, setInputValue] = React.useState(searchTerm);

  React.useEffect(() => {
    getTags().then(setAllTags);
  }, []);
  
  const filteredOrders = React.useMemo(() => {
    if (!searchTerm) return orders;
    const lowercasedSearchTerm = searchTerm.toLowerCase();

    return orders.filter(order => {
        const nameMatch = order.name.toLowerCase().includes(lowercasedSearchTerm);
        const descriptionMatch = order.description && order.description.toLowerCase().includes(lowercasedSearchTerm);
        const emailMatch = order.email && order.email.toLowerCase().includes(lowercasedSearchTerm);
        
        const orderTags = (order.tags || [])
          .map(tagId => allTags.find(t => t.id === tagId || t.label === tagId))
          .filter((t): t is Tag => !!t);
        const tagMatch = orderTags.some(tag => tag.label.toLowerCase().includes(lowercasedSearchTerm));

        return nameMatch || descriptionMatch || emailMatch || tagMatch;
    });
  }, [orders, searchTerm, allTags]);

  React.useEffect(() => {
    const handler = setTimeout(() => {
        const params = new URLSearchParams(searchParams);
        if (inputValue) {
            params.set('query', inputValue);
        } else {
            params.delete('query');
        }
        replace(`${pathname}?${params.toString()}`);
    }, 300);

    return () => clearTimeout(handler);
  }, [inputValue, pathname, replace, searchParams]);

  const handleDelete = async (id: string) => {
    try {
      await deleteOrder(id);
      toast({
        title: "Success",
        description: "Order deleted successfully.",
      });
      // This will trigger a re-render with the updated orders list from the server
      replace(pathname + '?' + searchParams.toString(), { scroll: false });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete order.",
      });
    }
  };

  const handleAllTagsUpdate = (newTags: Tag[]) => {
    setAllTags(newTags);
    // Optionally, re-fetch orders or just let the local state update the view
    replace(pathname + '?' + searchParams.toString(), { scroll: false });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center">
        <Input
          placeholder="Search by name, email, description, or tag..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="max-w-sm"
        />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Customer</TableHead>
              <TableHead className="w-[160px]">Status</TableHead>
              <TableHead className="w-[160px]">Sub-Status</TableHead>
              <TableHead>Items</TableHead>
              <TableHead className="w-[250px]">Tags Shipping</TableHead>
              <TableHead className="hidden md:table-cell w-[120px]">Delivery Deadline</TableHead>
              <TableHead className="text-right w-[120px]">Total</TableHead>
              <TableHead className="w-[100px]">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.length > 0 ? (
              filteredOrders.map((order) => (
                <OrderTableRow 
                    key={order.id} 
                    order={order} 
                    allTags={allTags}
                    onAllTagsUpdate={handleAllTagsUpdate}
                    onDelete={handleDelete} />
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No orders found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
