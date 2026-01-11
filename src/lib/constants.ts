
export const ORDER_STATUSES = ['Cotización', 'New', 'On Hand/Working', 'Urgent', 'Pending', 'Packaging', 'Done'] as const;

export const PRIVACY_OPTIONS = ['Por preguntar', 'Limitado Fecha', 'no respondió', 'ilimitado', 'Limitado Otros'] as const;

export const DELIVERY_SERVICES = ['Uno Express', 'Delivery Rolando', 'Delivery Daniel', 'Delivery Otros', 'Uber', 'InDriver', 'Retiro taller'] as const;

export const INVENTORY_COLORS = [
  { label: 'Transparent', value: 'Transparent', class: 'bg-[linear-gradient(45deg,#e5e7eb_25%,transparent_25%,transparent_75%,#e5e7eb_75%,#e5e7eb),linear-gradient(45deg,#e5e7eb_25%,transparent_25%,transparent_75%,#e5e7eb_75%,#e5e7eb)] bg-[length:10px_10px] bg-[position:0_0,5px_5px] border-slate-300' },
  { label: 'Frost', value: 'Frost', class: 'bg-white/40 backdrop-blur-md border-white/60 shadow-[inset_0_0_10px_rgba(255,255,255,0.5)]' },
  { label: 'Gold', value: 'Gold', class: 'bg-gradient-to-br from-yellow-200 via-yellow-500 to-amber-600 border-amber-700' },
  { label: 'Silver', value: 'Silver', class: 'bg-gradient-to-br from-slate-100 via-slate-400 to-slate-600 border-slate-500' },
  { label: 'White', value: 'White', class: 'bg-white border-slate-200' },
  { label: 'Black', value: 'Black', class: 'bg-neutral-900 border-neutral-700' },
  { label: 'Red', value: 'Red', class: 'bg-red-600' },
  { label: 'Blue', value: 'Blue', class: 'bg-blue-600' },
  { label: 'Green', value: 'Green', class: 'bg-emerald-600' },
  { label: 'Natural/Wood', value: 'Natural', class: 'bg-amber-200 border-amber-300' },
  { label: 'Walnut', value: 'Walnut', class: 'bg-amber-900' },
] as const;
