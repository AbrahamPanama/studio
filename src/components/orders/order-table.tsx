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
import { Edit, Trash2, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

import type { Order } from '@/lib/types';
import { formatCurrency, sanitizePhoneNumber, formatDate } from '@/lib/utils';
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
import { ORDER_STATUSES, ORDER_SUB_STATUSES } from '@/lib/constants';

const OrderTableRow = ({ order, onDelete }: { order: Order, onDelete: (id: string) => void }) => {
  const [formattedDate, setFormattedDate] = React.useState('');
  const [isPending, startTransition] = React.useTransition();
  const { toast } = useToast();

  const [name, setName] = React.useState(order.name);
  const [status, setStatus] = React.useState(order.estado);
  const [subStatus, setSubStatus] = React.useState(order.subEstado);

  React.useEffect(() => {
    setFormattedDate(formatDate(order.entrega));
  }, [order.entrega]);

  const handleDelete = () => {
    startTransition(async () => {
      onDelete(order.id);
    });
  }

  const handleFieldUpdate = (fieldName: keyof Order, value: any) => {
    startTransition(async () => {
      try {
        const updatedOrderData = {
          ...order,
          entrega: new Date(order.entrega),
          entregaLimite: new Date(order.entregaLimite),
          [fieldName]: value,
        };
        await updateOrder(order.id, updatedOrderData);
        toast({
          title: 'Success',
          description: `Order ${fieldName} updated.`,
        });
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: `Failed to update ${fieldName}.`,
        });
        if (fieldName === 'name') setName(order.name);
        if (fieldName === 'estado') setStatus(order.estado);
        if (fieldName === 'subEstado') setSubStatus(order.subEstado);
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


  return (
    <TableRow>
      <TableCell>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleNameBlur}
          className="font-medium border-0 focus-visible:ring-1 focus-visible:ring-ring"
        />
        <div className="text-sm text-muted-foreground flex items-center">
          {order.celular}
          <Button variant="ghost" size="icon" className="h-6 w-6 ml-1" asChild>
            <a href={`https://wa.me/${sanitizePhoneNumber(order.celular)}`} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp ${order.name}`}>
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </TableCell>
      <TableCell>
        <Select value={status} onValueChange={handleStatusChange} disabled={isPending}>
            <SelectTrigger className="w-[150px] border-0 focus:ring-1 focus:ring-ring p-0 h-auto bg-transparent">
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
      <TableCell>
        <Select value={subStatus} onValueChange={handleSubStatusChange} disabled={isPending}>
            <SelectTrigger className="w-[150px] border-0 focus:ring-1 focus:ring-ring p-0 h-auto bg-transparent capitalize">
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {ORDER_SUB_STATUSES.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
            </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        {formattedDate || <span className="text-muted-foreground">Loading...</span>}
      </TableCell>
      <TableCell className="text-right">{formatCurrency(order.orderTotal)}</TableCell>
      <TableCell>
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
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sub-Status</TableHead>
              <TableHead className="hidden md:table-cell">Delivery Date</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>
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
                <TableCell colSpan={6} className="h-24 text-center">
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
