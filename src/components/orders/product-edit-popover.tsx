'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { productSchema } from '@/lib/schema';
import type { Order } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { updateOrder } from '@/lib/actions';
import { Save } from 'lucide-react';

const popoverFormSchema = z.object({
  productos: z.array(productSchema),
});

type PopoverFormValues = z.infer<typeof popoverFormSchema>;

export function ProductEditPopover({
  order,
  children,
  onStatusChange,
}: {
  order: Order;
  children: React.ReactNode;
  onStatusChange: (status: Order['estado']) => void;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isStatusAlertOpen, setIsStatusAlertOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<PopoverFormValues>({
    resolver: zodResolver(popoverFormSchema),
    defaultValues: {
      productos: order.productos.map(p => ({...p, description: p.description || ''})),
    },
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: 'productos',
  });

  React.useEffect(() => {
    // Reset form when order changes or popover is opened
    form.reset({ productos: order.productos.map(p => ({...p, description: p.description || ''})) });
  }, [order, isOpen, form]);

  const handleUpdate = (data: PopoverFormValues, newStatus?: Order['estado']) => {
    startTransition(async () => {
      try {
        const payload: Partial<Order> = { productos: data.productos };
        if (newStatus) {
          payload.estado = newStatus;
        }

        await updateOrder(order.id, payload);
        toast({
          title: 'Success',
          description: 'Products have been updated.' + (newStatus ? ` Status set to ${newStatus}.` : ''),
        });
        
        if (newStatus) {
            onStatusChange(newStatus);
        }

        setIsOpen(false);
        setIsStatusAlertOpen(false);
        router.refresh();
      } catch (error) {
        console.error(error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to update products.',
        });
      }
    });
  };

  const onSubmit = (data: PopoverFormValues) => {
    const allReady = data.productos.every(p => p.materialsReady);
    if (allReady && order.estado !== 'Done' && order.estado !== 'Packaging') {
      setIsStatusAlertOpen(true);
    } else {
      handleUpdate(data);
    }
  };

  const handleStatusChange = (newStatus: Order['estado']) => {
    const data = form.getValues();
    handleUpdate(data, newStatus);
  }

  return (
    <>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>{children}</PopoverTrigger>
        <PopoverContent className="w-80">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">Edit Items</h4>
                  <p className="text-sm text-muted-foreground">
                    Update product ready status.
                  </p>
                </div>
                <div className="grid gap-2 max-h-60 overflow-y-auto pr-2">
                  {fields.map((item, index) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-[1fr_auto] items-center gap-4"
                    >
                      <div>
                        <FormField
                          control={form.control}
                          name={`productos.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input {...field} readOnly className="border-0 bg-transparent shadow-none" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`productos.${index}.description`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input {...field} readOnly className="border-0 bg-transparent shadow-none text-sm text-muted-foreground" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name={`productos.${index}.materialsReady`}
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="font-normal">Ready</FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}
                </div>
                <Button type="submit" disabled={isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </Form>
        </PopoverContent>
      </Popover>

      <AlertDialog open={isStatusAlertOpen} onOpenChange={setIsStatusAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>All items are ready!</AlertDialogTitle>
            <AlertDialogDescription>
              Do you want to change the order status?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-between">
             <AlertDialogCancel onClick={() => handleUpdate(form.getValues())}>
              Just Save
            </AlertDialogCancel>
            <div className="flex gap-2">
                <AlertDialogAction onClick={() => handleStatusChange('Packaging')} disabled={isPending}>
                Set to Packaging
                </AlertDialogAction>
                <AlertDialogAction onClick={() => handleStatusChange('Done')} disabled={isPending}>
                Set to Done
                </AlertDialogAction>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
