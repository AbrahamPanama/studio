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
}: {
  order: Order;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<PopoverFormValues>({
    resolver: zodResolver(popoverFormSchema),
    defaultValues: {
      productos: order.productos,
    },
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: 'productos',
  });

  React.useEffect(() => {
    // Reset form when order changes or popover is opened
    form.reset({ productos: order.productos });
  }, [order, isOpen, form]);

  const onSubmit = (data: PopoverFormValues) => {
    startTransition(async () => {
      try {
        await updateOrder(order.id, { productos: data.productos });
        toast({
          title: 'Success',
          description: 'Products have been updated.',
        });
        setIsOpen(false);
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

  return (
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
  );
}
