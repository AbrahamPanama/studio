
import { z } from 'zod';
import { orderSchema, productSchema, tagSchema } from '@/lib/schema';

export type Product = z.infer<typeof productSchema> & {
    id?: string;
};

export type Order = Omit<z.infer<typeof orderSchema>, 'tags' | 'tagsOther' | 'productos'> & {
  id: string;
  orderNumber: string;
  fechaIngreso: Date;
  productos: Product[];
  abono?: boolean;
  cancelo?: boolean;
  totalAbono?: number;
  tags?: string[];
  tagsOther?: string[];
  customTag1?: string;
  customTag2?: string;
  customTag3?: string;
  customTag4?: string;
  createdBy?: string;
};

export type Tag = z.infer<typeof tagSchema>;
