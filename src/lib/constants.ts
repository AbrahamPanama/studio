
export const ORDER_STATUSES = ['Cotización', 'New', 'On Hand/Working', 'Urgent', 'Pending', 'Packaging', 'Done'] as const;
export const PRIVACY_OPTIONS = ['Por preguntar', 'Limitado Fecha', 'no respondió', 'ilimitado', 'Limitado Otros'] as const;
export const DELIVERY_SERVICES = ['Uno Express', 'Delivery Rolando', 'Delivery Daniel', 'Delivery Otros', 'Uber', 'InDriver', 'Retiro taller'] as const;

export const INVENTORY_COLORS = [
  // Special Finishes
  { 
    label: 'Transparent', 
    value: 'Transparent', 
    // Diagonal stripes pattern
    class: 'bg-[repeating-linear-gradient(45deg,transparent,transparent_5px,#e5e7eb_5px,#e5e7eb_10px)] bg-white border border-slate-400' 
  },
  { 
    label: 'Frost', 
    value: 'Frost', 
    // Hazy/Blurry look
    class: 'bg-white/60 backdrop-blur-md border-2 border-slate-200 shadow-inner' 
  },
  { 
    label: 'Gold', 
    value: 'Gold', 
    // Shiny Gold Gradient
    class: 'bg-gradient-to-br from-[#FFD700] via-[#FDB931] to-[#C06C02] border border-yellow-700' 
  },
  { 
    label: 'Silver', 
    value: 'Silver', 
    // Shiny Silver Gradient
    class: 'bg-gradient-to-br from-[#E0E0E0] via-[#BDBDBD] to-[#757575] border border-slate-600' 
  },

  // Standard Colors
  { label: 'White', value: 'White', class: 'bg-white border border-slate-300' },
  { label: 'Black', value: 'Black', class: 'bg-neutral-900 border border-neutral-700' },
  { label: 'Grey', value: 'Grey', class: 'bg-gray-500 border border-gray-600' },
  { label: 'Red', value: 'Red', class: 'bg-red-600 border border-red-700' },
  { label: 'Blue', value: 'Blue', class: 'bg-blue-600 border border-blue-700' },
  { label: 'Green', value: 'Green', class: 'bg-emerald-600 border border-emerald-700' },
  { label: 'Yellow', value: 'Yellow', class: 'bg-yellow-400 border border-yellow-500' },
  { label: 'Orange', value: 'Orange', class: 'bg-orange-500 border border-orange-600' },
  { label: 'Purple', value: 'Purple', class: 'bg-purple-600 border border-purple-700' },
  { label: 'Pink', value: 'Pink', class: 'bg-pink-500 border border-pink-600' },
  { label: 'Brown', value: 'Brown', class: 'bg-amber-800 border border-amber-900' },
] as const;
