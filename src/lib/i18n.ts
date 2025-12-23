
export const translations = {
  en: {
    orders: 'Orders',
    manageOrders: 'Manage and track all customer orders.',
    active: 'Active',
    quotes: 'Quotes',
    completed: 'Completed',
    search: 'Search',
    searchPlaceholder: 'Search orders...',
    clear: 'Clear',
    newQuote: 'New Quote',
    newOrder: 'New Order',
    noOrders: 'No orders found for this view.',
  },
  es: {
    orders: 'Pedidos',
    manageOrders: 'Gestiona y sigue todos los pedidos de los clientes.',
    active: 'Activos',
    quotes: 'Cotizaciones',
    completed: 'Completados',
    search: 'Buscar',
    searchPlaceholder: 'Buscar pedidos...',
    clear: 'Limpiar',
    newQuote: 'Nueva Cotización',
    newOrder: 'Nuevo Pedido',
    noOrders: 'No se encontraron pedidos para esta vista.',
  },
};

export type TranslationKey = keyof typeof translations.en;
