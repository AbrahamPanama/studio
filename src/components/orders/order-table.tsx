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

import type { Order } from '@/lib/types';
import { cn, formatCurrency, formatDate, sanitizePhoneNumber } from '@/lib/utils';
import { StatusBadge } from '@/components/shared/status-badge';
import { deleteOrder, updateOrder } from '@/lib/actions';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const OrderTableRow = ({ order, onDelete }: { order: Order, onDelete: (id: string) => void }) => {
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
        const updatedData = { ...order, [fieldName]: value };
        
        // Pass the plain object to the server action. 
        // The server action is responsible for validation.
        await updateOrder(order.id, updatedData);

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
      {p.name}
      {index < order.productos.length - 1 && ', '}
    </span>
  ));

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
            <Button variant="ghost" size="icon" className="h-6 w-6 ml-1" asChild>
                <a href={`https://wa.me/${sanitizePhoneNumber(order.celular)}`} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp ${order.name}`}>
                    <svg fill="currentColor" viewBox="0 0 24 24" className="h-4 w-4">
                        <path d="M16.75 13.96c.25.13.43.2.5.33.07.13.07.75-.16 1.43-.2.6-.48.93-.73 1.05-.25.13-.5.13-.88.06-.38-.07-1.4-.46-2.6-1.55-1.5-1.3-2.6-2.9-2.9-3.4-.3-.5-.6-1-.6-1.5s.2-1 .4-1.2c.2-.2.4-.3.6-.3s.4.1.6.4a8.6 8.6 0 01.9 1.2c.2.3.3.4.2.7-.1.3-.2.4-.4.6-.2.2-.3.3-.4.4-.1.1-.1.2 0 .4.2.3.8.9 1.6 1.7.9.8 1.5 1.2 1.7 1.4.2.2.4.3.6.2.2-.1.4-.3.5-.4.2-.1.3-.1.4-.1.1 0 .3.1.4.2zM12 2a10 10 0 100 20 10 10 0 000-20zm0 18.5a8.5 8.5 0 110-17 8.5 8.5 0 010 17z"/>
                    </svg>
                </a>
            </Button>
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
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <p className="line-clamp-3">{productSummary}</p>
                </TooltipTrigger>
                <TooltipContent>
                    <p className="max-w-xs">{productSummary}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
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
  
  const searchTerm = searchParams.get('query')?.toString() || '';
  const [inputValue, setInputValue] = React.useState(searchTerm);
  
  const filteredOrders = React.useMemo(() => orders.filter(order =>
    order.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (order.description && order.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (order.email && order.email.toLowerCase().includes(searchTerm.toLowerCase()))
  ), [orders, searchTerm]);

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center">
        <Input
          placeholder="Search by name, email, or description..."
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
                <OrderTableRow key={order.id} order={order} onDelete={handleDelete} />
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
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
