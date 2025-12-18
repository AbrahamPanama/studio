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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MoreHorizontal, Edit, Trash2, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

import type { Order } from '@/lib/types';
import { formatCurrency, sanitizePhoneNumber, formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/shared/status-badge';
import { deleteOrder } from '@/lib/actions';
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


export function OrderTable({ orders }: { orders: Order[] }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();
  
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
    startTransition(async () => {
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
    });
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
                <TableRow key={order.id}>
                  <TableCell>
                    <div className="font-medium">{order.name}</div>
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
                    <StatusBadge status={order.estado} />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {formatDate(order.entrega)}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(order.orderTotal)}</TableCell>
                  <TableCell>
                    <AlertDialog>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link href={`/orders/${order.id}/edit`}>
                              <Edit className="mr-2 h-4 w-4"/>
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={(e) => e.preventDefault()}>
                              <Trash2 className="mr-2 h-4 w-4"/>
                              Delete
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
                            onClick={() => handleDelete(order.id)}
                            disabled={isPending}
                            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                          >
                            {isPending ? "Deleting..." : "Delete"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
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
