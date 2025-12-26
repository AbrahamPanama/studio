
import { z } from 'zod';
import { ORDER_STATUSES, ORDER_SUB_STATUSES, DELIVERY_SERVICES, PRIVACY_OPTIONS } from './constants';

export const productSchema = z.object({
  id: z.string().optional(), // for existing products
  name: z.string().min(1, 'Product name is required.'),
  description: z.string().optional(),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1.'),
  price: z.coerce.number().min(0, 'Price cannot be negative.'),
  materialsReady: z.boolean().default(false),
  isTaxable: z.boolean().default(true),
});

export const orderSchema = z.object({
  orderNumber: z.string().optional(),
  name: z.string().min(2, 'Name must be at least 2 characters.').max(100),
  companyName: z.string().optional(),
  email: z.string().email('Invalid email address.').optional().or(z.literal('')),
  celular: z.string().min(1, 'Phone number is required.'),
  celularSecundario: z.string().optional(),
  ruc: z.string().optional(),
  description: z.string().max(300, 'Description cannot exceed 300 characters.').optional(),
  comentarios: z.string().optional(),
  
  // CORRECCIÓN CRÍTICA 1: Permitir explícitamente el estado 'Cotización'
  estado: z.enum(ORDER_STATUSES).or(z.literal('Cotización')).default('New'),
  subEstado: z.enum(ORDER_SUB_STATUSES).default('Pendiente'),

  // CORRECCIÓN CRÍTICA 2: Pre-procesar fechas para que los strings vacíos no rompan la validación
  entrega: z.preprocess((arg) => (arg === '' || arg === null ? undefined : arg), z.coerce.date().optional()),
  entregaLimite: z.preprocess((arg) => (arg === '' || arg === null ? undefined : arg), z.coerce.date().optional()),
  
  // CORRECCIÓN CRÍTICA 3: Permitir strings vacíos en selectores ocultos
  servicioEntrega: z.enum(DELIVERY_SERVICES).optional().or(z.literal('')),
  direccionEnvio: z.string().optional(),

  abono: z.boolean().default(false),
  cancelo: z.boolean().default(false),
  totalAbono: z.coerce.number().default(0),

  privacidad: z.enum(PRIVACY_OPTIONS).default('Por preguntar'),
  tags: z.array(z.string()).default([]),
  tagsOther: z.array(z.string()).default([]),
  
  productos: z.array(productSchema).min(1, 'At least one product is required.'),

  itbms: z.boolean().default(false),
  subtotal: z.coerce.number().default(0),
  tax: z.coerce.number().default(0),
  orderTotal: z.coerce.number().default(0),

  createdBy: z.string().optional(),
}).superRefine((data, ctx) => {
    // Solo aplicamos reglas estrictas si NO es una cotización
    if (data.estado !== 'Cotización') {
        if (!data.entrega) {
            ctx.addIssue({
                code: z.ZodIssueCode.invalid_date,
                path: ['entrega'],
                message: 'Delivery date is required for orders.',
            });
        }
        if (!data.entregaLimite) {
            ctx.addIssue({
                code: z.ZodIssueCode.invalid_date,
                path: ['entregaLimite'],
                message: 'Delivery deadline is required for orders.',
            });
        }
        if (!data.servicioEntrega || data.servicioEntrega === '') {
            ctx.addIssue({
                code: z.ZodIssueCode.invalid_enum_value,
                path: ['servicioEntrega'],
                message: 'Delivery service is required for orders.',
            });
        }
    }
});

export const tagSchema = z.object({
  id: z.string(),
  label: z.string().min(1, "Label is required"),
  color: z.string().min(1, "Color is required"),
});
