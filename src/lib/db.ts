'use server';

import fs from 'fs/promises';
import path from 'path';
import type { Order } from './types';

// The path to the JSON file that will act as our database.
const dbPath = path.join(process.cwd(), 'src', 'lib', 'db.json');

// Initial data structure if the file doesn't exist.
const initialData: { orders: Order[] } = {
  orders: [
    {
      id: '1',
      name: 'John Doe',
      email: 'john.doe@example.com',
      celular: '+1 (234) 567-890',
      description: 'A sample order for 10 T-shirts and 20 mugs.',
      comentarios: 'Customer requested a specific blue color for the t-shirts.',
      estado: 'New',
      subEstado: 'Pendiente Arte',
      fechaIngreso: new Date('2023-10-26T10:00:00Z'),
      entrega: new Date('2024-07-05'),
      entregaLimite: new Date('2024-07-10'),
      servicioEntrega: 'Uber',
      direccionEnvio: '123 Main St, Anytown, USA',
      privacidad: 'ilimitado',
      productos: [
          { id: 'p1', name: 'T-Shirt', quantity: 10, price: 15, materialsReady: true },
          { id: 'p2', name: 'Mug', quantity: 20, price: 8, materialsReady: false },
      ],
      orderTotal: (10 * 15) + (20 * 8), // 310
      customTag1: 'Urgent Project',
      customTag2: '',
      customTag3: '',
      customTag4: '',
    },
    {
        id: '2',
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        celular: '098-765-4321',
        description: '500 business cards, urgent requirement.',
        comentarios: 'Use the new logo file provided via email.',
        estado: 'Urgent',
        subEstado: 'Pendiente Material',
        fechaIngreso: new Date('2023-10-27T11:00:00Z'),
        entrega: new Date('2024-07-01'),
        entregaLimite: new Date('2024-07-01'),
        servicioEntrega: 'Retiro taller',
        direccionEnvio: 'Retiro Taller',
        privacidad: 'Limitado Fecha',
        productos: [
            { id: 'p3', name: 'Business Cards', quantity: 500, price: 0.5, materialsReady: false },
        ],
        orderTotal: 250,
        customTag1: 'High Priority',
        customTag2: '',
        customTag3: '',
        customTag4: '',
    },
     {
        id: '3',
        name: 'Peter Jones',
        email: 'peter.jones@example.com',
        celular: '555 123 4567',
        description: '1000 vinyl stickers, completed.',
        comentarios: 'Customer was very happy with the quality.',
        estado: 'Done',
        subEstado: 'Check List',
        fechaIngreso: new Date('2023-10-20T09:00:00Z'),
        entrega: new Date('2024-06-25'),
        entregaLimite: new Date('2024-06-25'),
        servicioEntrega: 'Uno Express',
        direccionEnvio: '456 Oak Ave, Somecity, USA',
        privacidad: 'no respondió',
        productos: [
            { id: 'p4', name: 'Vinyl Stickers', quantity: 1000, price: 0.2, materialsReady: true },
        ],
        orderTotal: 200,
        customTag1: 'Repeat Customer',
        customTag2: '',
        customTag3: '',
        customTag4: '',
    }
  ],
};

/**
 * Reads the entire database from the JSON file.
 * If the file doesn't exist, it creates it with initial data.
 */
export async function readDb(): Promise<{ orders: Order[] }> {
  try {
    await fs.access(dbPath);
  } catch (error) {
    // If the file does not exist, create it with initial data
    await fs.writeFile(dbPath, JSON.stringify(initialData, null, 2), 'utf8');
    return initialData;
  }

  const fileContent = await fs.readFile(dbPath, 'utf8');
  if (!fileContent) {
    return initialData;
  }

  const data = JSON.parse(fileContent);
  // Dates are stored as strings in JSON, so we need to convert them back to Date objects
  data.orders = data.orders.map((order: Order) => ({
    ...order,
    fechaIngreso: new Date(order.fechaIngreso),
    entrega: new Date(order.entrega),
    entregaLimite: new Date(order.entregaLimite),
  }));

  return data;
}

/**
 * Writes the entire database to the JSON file.
 */
export async function writeDb(data: { orders: Order[] }): Promise<void> {
  await fs.writeFile(dbPath, JSON.stringify({
    orders: data.orders.sort((a, b) => new Date(b.fechaIngreso).getTime() - new Date(a.fechaIngreso).getTime())
  }, null, 2), 'utf8');
}
