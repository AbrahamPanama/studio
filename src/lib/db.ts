'use server';

import fs from 'fs/promises';
import path from 'path';
import type { Order, Tag } from './types';

// The path to the JSON file that will act as our database.
const dbPath = path.join(process.cwd(), 'src', 'lib', 'db.json');
const tagsPath = path.join(process.cwd(), 'src', 'lib', 'tags.json');

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
      tags: ['Urgent Project'],
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
        tags: ['High Priority'],
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
        tags: ['Repeat Customer'],
    }
  ],
};

const initialTags: { tags: Tag[] } = {
    tags: [
        { id: "1", label: "Urgente", color: "hsl(0, 84%, 60%)" },
        { id: "2", label: "Punta Pacífica", color: "hsl(35, 92%, 55%)" },
        { id: "3", label: "Brisas del Golf", color: "hsl(25, 50%, 40%)" },
        { id: "4", label: "Los Andes", color: "hsl(210, 20%, 60%)" },
        { id: "5", label: "Noche", color: "hsl(320, 80%, 60%)" },
        { id: "6", label: "Colón", color: "hsl(150, 80%, 40%)" },
        { id: "7", label: "Aguadulce", color: "hsl(0, 60%, 50%)" },
        { id: "8", label: "Tarde", color: "hsl(270, 60%, 60%)" },
        { id: "9", label: "Bugaba", color: "hsl(80, 60%, 50%)" },
        { id: "10", label: "Interior", color: "hsl(260, 60%, 60%)" },
        { id: "11", label: "Verificado", color: "hsl(45, 100%, 50%)" },
        { id: "12", label: "Panamá", color: "hsl(220, 80%, 60%)" },
        { id: "13", label: "Los Santos", color: "hsl(10, 80%, 60%)" },
        { id: "14", label: "Albrook", color: "hsl(200, 100%, 40%)" },
        { id: "15", label: "Retiro", color: "hsl(330, 80%, 80%)" },
        { id: "16", label: "Vista Hermosa", color: "hsl(50, 50%, 50%)" },
        { id: "17", label: "David", color: "hsl(190, 80%, 60%)" },
        { id: "18", label: "Las Tablas", color: "hsl(0, 80%, 80%)" },
        { id: "19", label: "Envío", color: "hsl(20, 90%, 60%)" },
        { id: "20", label: "Villa Lucre", color: "hsl(230, 80%, 60%)" },
        { id: "21", label: "Penonomé", color: "hsl(30, 10%, 50%)" },
        { id: "22", label: "La Doña", color: "hsl(250, 80%, 60%)" }
    ]
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


export async function readTags(): Promise<Tag[]> {
  try {
    await fs.access(tagsPath);
  } catch (error) {
    await fs.writeFile(tagsPath, JSON.stringify(initialTags, null, 2), 'utf8');
    return initialTags.tags;
  }

  const fileContent = await fs.readFile(tagsPath, 'utf8');
  if (!fileContent) {
    return initialTags.tags;
  }

  return JSON.parse(fileContent).tags;
}

export async function writeTags(tags: Tag[]): Promise<void> {
    await fs.writeFile(tagsPath, JSON.stringify({ tags }, null, 2), 'utf8');
}
