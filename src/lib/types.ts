
import { z } from 'zod';
import type { Timestamp } from 'firebase/firestore';
import { orderSchema, productSchema, tagSchema } from '@/lib/schema';

export type Product = z.infer<typeof productSchema> & {
    id?: string;
};

export type Material = z.infer<typeof orderSchema>['materials'][number];

export type Order = Omit<z.infer<typeof orderSchema>, 'fechaIngreso' | 'entrega' | 'entregaLimite' | 'productos' | 'materials'> & {
  id: string;
  orderNumber: string;
  fechaIngreso: Timestamp | string | Date;
  entrega: Timestamp | string | Date;
  entregaLimite: Timestamp | string | Date;
  productos: Product[];
  materials: Material[];
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
  ruc?: string;
  celularSecundario?: string;
  direccionEnvio?: string;
  companyName?: string;
};

export type Tag = z.infer<typeof tagSchema>;
