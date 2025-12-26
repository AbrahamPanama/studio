
import { z } from 'zod';
import { orderSchema, productSchema, tagSchema } from '@/lib/schema';

export type Product = z.infer<typeof productSchema> & {
    id?: string;
};

// Making properties that are optional in the form truly optional in the final type.
// Timestamps from Firestore will be strings after serialization.
export type Order = Omit<z.infer<typeof orderSchema>, 'fechaIngreso' | 'entrega' | 'entregaLimite' | 'productos'> & {
  id: string;
  orderNumber: string;
  fechaIngreso: string; // Will be ISO string from Firestore
  entrega: string; // Will be ISO string from Firestore
  entregaLimite: string; // Will be ISO string from Firestore
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
  ruc?: string;
  celularSecundario?: string;
  direccionEnvio?: string;
  companyName?: string;
};

export type Tag = z.infer<typeof tagSchema>;
