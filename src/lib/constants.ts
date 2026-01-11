
export const ORDER_STATUSES = ['Cotización', 'New', 'On Hand/Working', 'Urgent', 'Pending', 'Packaging', 'Done'] as const;
export const PRIVACY_OPTIONS = ['Por preguntar', 'Limitado Fecha', 'no respondió', 'ilimitado', 'Limitado Otros'] as const;
export const DELIVERY_SERVICES = ['Uno Express', 'Delivery Rolando', 'Delivery Daniel', 'Delivery Otros', 'Uber', 'InDriver', 'Retiro taller'] as const;

export const INVENTORY_COLORS = [
  // SPECIAL FINISHES
  { 
    label: 'Transparent', 
    value: 'Transparent', 
    style: { 
      background: 'repeating-linear-gradient(45deg, #e5e7eb 0px, #e5e7eb 5px, #ffffff 5px, #ffffff 10px)',
      border: '1px solid #cbd5e1'
    } 
  },
  { 
    label: 'Frost', 
    value: 'Frost', 
    style: { 
      background: 'rgba(255,255,255,0.6)', 
      backdropFilter: 'blur(4px)',
      border: '2px solid #e2e8f0',
      boxShadow: 'inset 0 0 6px rgba(0,0,0,0.05)'
    } 
  },
  { 
    label: 'Gold', 
    value: 'Gold', 
    style: { 
      background: 'linear-gradient(135deg, #fcd34d 0%, #fbbf24 50%, #b45309 100%)', 
      border: '1px solid #b45309' 
    } 
  },
  { 
    label: 'Silver', 
    value: 'Silver', 
    style: { 
      background: 'linear-gradient(135deg, #f1f5f9 0%, #94a3b8 50%, #475569 100%)', 
      border: '1px solid #475569' 
    } 
  },

  // STANDARD COLORS
  { label: 'White', value: 'White', style: { background: '#ffffff', border: '1px solid #e2e8f0' } },
  { label: 'Black', value: 'Black', style: { background: '#171717', border: '1px solid #171717' } },
  { label: 'Grey', value: 'Grey', style: { background: '#6b7280', border: '1px solid #4b5563' } },
  { label: 'Red', value: 'Red', style: { background: '#dc2626', border: '1px solid #b91c1c' } },
  { label: 'Blue', value: 'Blue', style: { background: '#2563eb', border: '1px solid #1d4ed8' } },
  { label: 'Green', value: 'Green', style: { background: '#16a34a', border: '1px solid #15803d' } },
  { label: 'Yellow', value: 'Yellow', style: { background: '#facc15', border: '1px solid #eab308' } },
  { label: 'Orange', value: 'Orange', style: { background: '#f97316', border: '1px solid #ea580c' } },
  { label: 'Purple', value: 'Purple', style: { background: '#9333ea', border: '1px solid #7e22ce' } },
  { label: 'Pink', value: 'Pink', style: { background: '#ec4899', border: '1px solid #db2777' } },
  { label: 'Brown', value: 'Brown', style: { background: '#78350f', border: '1px solid #451a03' } },
] as const;
