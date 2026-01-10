
import { z } from 'zod';

export const RESOURCE_TYPES = ['Material', 'Labor', 'Machine', 'Outsource'] as const;
export const UNITS = ['Sheet', 'cm2', 'm', 'Liter', 'Hour', 'Minute', 'Unit'] as const;

// Master list of available resources (Inventory/Rates)
export const resourceItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"), // e.g., "Acrylic 3mm Black"
  type: z.enum(RESOURCE_TYPES), // Material vs Labor vs Machine Time
  defaultUnit: z.enum(UNITS), 
  defaultCostPerUnit: z.coerce.number().min(0, "Cost must be a positive number"), // Your cost (not sale price)
  stockQuantity: z.coerce.number().optional(), // Optional: Simple inventory tracking
});

// The Production Log (The BOM for an Order)
export const productionLogSchema = z.object({
  id: z.string().optional(),
  orderId: z.string(), // Reference to parent Order
  
  // Link to the specific line item in the Order's "productos" array
  // This is crucial. If an order has 2 types of signs, we need to know 
  // which sign this material is for.
  relatedProductId: z.string().optional(), 
  
  // Copied from Resource Library (Snapshot in time)
  resourceName: z.string(),
  resourceType: z.enum(RESOURCE_TYPES),
  
  // Usage details
  quantityUsed: z.coerce.number().min(0, "Quantity must be positive"),
  unit: z.enum(UNITS),
  costPerUnit: z.coerce.number().min(0), // Snapshot cost at time of usage
  
  // Calculated fields
  totalCost: z.coerce.number().default(0), // quantityUsed * costPerUnit
  
  notes: z.string().optional(), // e.g., "Laser settings: 50/50"
  dateAdded: z.preprocess((arg) => (arg === '' || arg === null ? undefined : arg), z.coerce.date().default(() => new Date())),
});
