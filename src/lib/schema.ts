import { z } from 'zod';
import { ORDER_STATUSES, ORDER_SUB_STATUSES, DELIVERY_SERVICES, PRIVACY_OPTIONS } from './constants';

export const productSchema = z.object({
  id: z.string().optional(), // for existing products
  name: z.string().min(1, 'Product name is required.'),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1.'),
  price: z.coerce.number().min(0, 'Price cannot be negative.'),
  materialsReady: z.boolean().default(false),
});

export const orderSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.').max(100),
  email: z.string().email('Invalid email address.').optional().or(z.literal('')),
  celular: z.string().min(1, 'Phone number is required.'),
  description: z.string().max(300, 'Description cannot exceed 300 characters.').optional(),
  comentarios: z.string().optional(),
  
  estado: z.enum(ORDER_STATUSES).default('New'),
  subEstado: z.enum(ORDER_SUB_STATUSES).default('Pendiente'),

  entrega: z.coerce.date({ required_error: 'Delivery date is required.' }),
  entregaLimite: z.coerce.date({ required_error: 'Delivery deadline is required.' }),
  servicioEntrega: z.enum(DELIVERY_SERVICES).default('Retiro taller'),
  direccionEnvio: z.string().optional(),

  abono: z.boolean().default(false),
  cancelo: z.boolean().default(false),
  totalAbono: z.coerce.number().default(0),

  privacidad: z.enum(PRIVACY_OPTIONS).default('Por preguntar'),
  customTag1: z.string().optional(),
  customTag2: z.string().optional(),
  customTag3: z.string().optional(),
  customTag4: z.string().optional(),
  
  productos: z.array(productSchema).min(1, 'At least one product is required.'),
  orderTotal: z.coerce.number().default(0),
});
