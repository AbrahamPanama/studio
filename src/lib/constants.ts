
export const ORDER_STATUSES = ['Cotización', 'New', 'On Hand/Working', 'Urgent', 'Pending', 'Packaging', 'Done'] as const;
export const PRIVACY_OPTIONS = ['Por preguntar', 'Limitado Fecha', 'no respondió', 'ilimitado', 'Limitado Otros'] as const;
export const DELIVERY_SERVICES = ['Uno Express', 'Delivery Rolando', 'Delivery Daniel', 'Delivery Otros', 'Uber', 'InDriver', 'Retiro taller'] as const;

export const INVENTORY_COLORS = [
  // --- ROW 1: LIGHTS, VIBRANTS & PASTELS (13 + 2 new) ---
  { 
    label: 'Transparent', 
    value: 'Transparent', 
    style: { background: 'repeating-linear-gradient(45deg, #e5e7eb 0px, #e5e7eb 5px, #ffffff 5px, #ffffff 10px)', border: '1px solid #cbd5e1' } 
  },
  { 
    label: 'Frost', 
    value: 'Frost', 
    style: { background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(4px)', border: '1px solid #cbd5e1' } 
  },
  { label: 'White', value: 'White', style: { background: '#ffffff', border: '1px solid #e2e8f0' } },
  { label: 'Cream', value: 'Cream', style: { background: '#fdfbf7', border: '1px solid #e2e8f0' } }, // Off-white/Beige
  { label: 'Yellow', value: 'Yellow', style: { background: '#facc15', border: '1px solid #eab308' } },
  { label: 'Orange', value: 'Orange', style: { background: '#fb923c', border: '1px solid #ea580c' } },
  { label: 'Red', value: 'Red', style: { background: '#dc2626', border: '1px solid #b91c1c' } },
  { label: 'Baby Pink', value: 'Baby Pink', style: { background: '#fbcfe8', border: '1px solid #f9a8d4' } },
  { label: 'Pink', value: 'Pink', style: { background: '#ec4899', border: '1px solid #db2777' } },
  { label: 'Purple', value: 'Purple', style: { background: '#9333ea', border: '1px solid #7e22ce' } },
  { label: 'Blue', value: 'Blue', style: { background: '#2563eb', border: '1px solid #1d4ed8' } },
  { label: 'Aqua', value: 'Aqua', style: { background: '#22d3ee', border: '1px solid #06b6d4' } },
  { label: 'Teal', value: 'Teal', style: { background: '#14b8a6', border: '1px solid #0d9488' } },
  { label: 'Green', value: 'Green', style: { background: '#22c55e', border: '1px solid #16a34a' } },
  { label: 'Mint', value: 'Mint', style: { background: '#6ee7b7', border: '1px solid #34d399' } },

  // --- ROW 2: DARKS, METALLICS & WOODS (13) ---
  { label: 'Black', value: 'Black', style: { background: '#171717', border: '1px solid #000000' } },
  { label: 'Charcoal', value: 'Charcoal', style: { background: '#374151', border: '1px solid #1f2937' } }, // Matte Grey
  { label: 'Navy', value: 'Navy', style: { background: '#1e3a8a', border: '1px solid #172554' } },
  { label: 'Burgundy', value: 'Burgundy', style: { background: '#7f1d1d', border: '1px solid #450a0a' } },
  { label: 'Forest', value: 'Forest', style: { background: '#14532d', border: '1px solid #052e16' } },
  { label: 'Brown', value: 'Brown', style: { background: '#713f12', border: '1px solid #451a03' } },
  { label: 'Natural Wood', value: 'Natural', style: { background: '#d6c0a6', border: '1px solid #a89078' } }, // MDF/Plywood look
  { label: 'Walnut', value: 'Walnut', style: { background: '#5d4037', border: '1px solid #3e2723' } },
  { 
    label: 'Silver', 
    value: 'Silver', 
    style: { background: 'linear-gradient(135deg, #f1f5f9 0%, #94a3b8 50%, #475569 100%)', border: '1px solid #475569' } 
  },
  { 
    label: 'Gold', 
    value: 'Gold', 
    style: { background: 'linear-gradient(135deg, #fcd34d 0%, #fbbf24 50%, #b45309 100%)', border: '1px solid #b45309' } 
  },
  { 
    label: 'Rose Gold', 
    value: 'Rose Gold', 
    style: { background: 'linear-gradient(135deg, #ffe4e6 0%, #fda4af 50%, #e11d48 100%)', border: '1px solid #be123c' } 
  },
  { 
    label: 'Copper', 
    value: 'Copper', 
    style: { background: 'linear-gradient(135deg, #ffedd5 0%, #fdba74 50%, #c2410c 100%)', border: '1px solid #9a3412' } 
  },
  { 
    label: 'Holographic', 
    value: 'Holographic', 
    style: { background: 'linear-gradient(45deg, #ff9a9e 0%, #fad0c4 25%, #fad0c4 50%, #a18cd1 75%, #fbc2eb 100%)', border: '1px solid #d8b4fe' } 
  },
] as const;
