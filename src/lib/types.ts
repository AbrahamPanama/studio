import { z } from 'zod';
import { orderSchema, productSchema } from '@/lib/schema';

export type Product = z.infer<typeof productSchema>;

export type Order = z.infer<typeof orderSchema> & {
  id: string;
  fechaIngreso: Date;
};
