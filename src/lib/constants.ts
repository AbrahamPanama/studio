
export const ORDER_STATUSES = ['Cotización', 'New', 'On Hand/Working', 'Urgent', 'Pending', 'Packaging', 'Done'] as const;

export const PRIVACY_OPTIONS = ['Por preguntar', 'Limitado Fecha', 'no respondió', 'ilimitado', 'Limitado Otros'] as const;

export const DELIVERY_SERVICES = ['Uno Express', 'Delivery Rolando', 'Delivery Daniel', 'Delivery Otros', 'Uber', 'InDriver', 'Retiro taller'] as const;

export const INVENTORY_COLORS = [
  { label: 'Transparent', value: 'Transparent', class: 'bg-[linear-gradient(45deg,#e5e7eb_25%,transparent_25%,transparent_75%,#e5e7eb_75%,#e5e7eb),linear-gradient(45deg,#e5e7eb_25%,transparent_25%,transparent_75%,#e5e7eb_75%,#e5e7eb)] bg-[length:10px_10px] bg-[position:0_0,5px_5px] border border-slate-300' },
  { label: 'Frost', value: 'Frost', class: 'bg-white/30 backdrop-blur-md border border-white/60 shadow-sm relative after:content-[""] after:absolute after:inset-0 after:bg-gradient-to-tr after:from-white/10 after:to-transparent' },
  { label: 'White', value: 'White', class: 'bg-white border border-slate-200' },
  { label: 'Black', value: 'Black', class: 'bg-neutral-900 border border-neutral-700' },
  { label: 'Grey', value: 'Grey', class: 'bg-gray-400' },
  { label: 'Red', value: 'Red', class: 'bg-red-500' },
  { label: 'Orange', value: 'Orange', class: 'bg-orange-500' },
  { label: 'Gold', value: 'Gold', class: 'bg-yellow-400 border border-yellow-600' },
  { label: 'Yellow', value: 'Yellow', class: 'bg-yellow-300' },
  { label: 'Green', value: 'Green', class: 'bg-green-500' },
  { label: 'Blue', value: 'Blue', class: 'bg-blue-500' },
  { label: 'Navy', value: 'Navy', class: 'bg-blue-900' },
  { label: 'Purple', value: 'Purple', class: 'bg-purple-500' },
  { label: 'Pink', value: 'Pink', class: 'bg-pink-500' },
  { label: 'Brown', value: 'Brown', class: 'bg-amber-800' },
  { label: 'Silver', value: 'Silver', class: 'bg-slate-300 border border-slate-400' },
];
