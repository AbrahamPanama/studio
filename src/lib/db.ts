'use server';

import fs from 'fs/promises';
import path from 'path';
import type { Order, Tag } from './types';

// The path to the JSON file that will act as our database.
const dbPath = path.join(process.cwd(), 'src', 'lib', 'db.json');
const tagsPath = path.join(process.cwd(), 'src', 'lib', 'tags.json');
const tagsOtherPath = path.join(process.cwd(), 'src', 'lib', 'tags-other.json');

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
      tagsOther: [],
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
        tagsOther: [],
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
        tagsOther: [],
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

const initialOtherTags: { tags: Tag[] } = {
  "tags": [
    { "id": "other-1", "label": "Por Armar", "color": "#ef4444" },
    { "id": "other-2", "label": "Estado", "color": "#f97316" },
    { "id": "other-3", "label": "Por impresión", "color": "#84cc16" },
    { "id": "other-4", "label": "Incompleto", "color": "#10b981" },
    { "id": "other-5", "label": "Arte en reviision", "color": "#0ea5e9" },
    { "id": "other-6", "label": "Pend.Corte", "color": "#6366f1" },
    { "id": "other-7", "label": "Pend. Arte", "color": "#8b5cf6" },
    { "id": "other-8", "label": "Foto por subir", "color": "#ec4899" },
    { "id": "other-9", "label": "Corregir arte", "color": "#dc2626" },
    { "id": "other-10", "label": "Foto subida", "color": "#f59e0b" },
    { "id": "other-11", "label": "M. NO FOTO.", "color": "#a16207" },
    { "id": "other-12", "label": "Pend. Aproba", "color": "#65a30d" },
    { "id": "other-13", "label": "Pend. inform", "color": "#22d3ee" },
    { "id": "other-14", "label": "Arte Urgente", "color": "#3b82f6" },
    { "id": "other-15", "label": "Revisar whapsatt", "color": "#7c3aed" },
    { "id": "other-16", "label": "Pend. fecha", "color": "#c026d3" },
    { "id": "other-17", "label": "Pend. foto", "color": "#db2777" },
    { "id": "other-18", "label": "Organizador", "color": "#e11d48" },
    { "id": "other-19", "label": "Porta vela", "color": "#d97706" },
    { "id": "other-20", "label": "Material Incompleto", "color": "#ca8a04" },
    { "id": "other-21", "label": "Completo", "color": "#4d7c0f" },
    { "id": "other-22", "label": "705", "color": "#0d9488" },
    { "id": "other-23", "label": "BORLA", "color": "#0284c7" },
    { "id": "other-24", "label": "711", "color": "#4338ca" },
    { "id": "other-25", "label": "Corpus", "color": "#a78bfa" },
    { "id": "other-26", "label": "Cruces con luz", "color": "#be185d" },
    { "id": "other-27", "label": "Mini lamparas", "color": "#9f1239" },
    { "id": "other-28", "label": "Invitaciones", "color": "#ea580c" },
    { "id": "other-29", "label": "Recordatorios", "color": "#b45309" },
    { "id": "other-30", "label": "Lampara", "color": "#16a34a" },
    { "id": "other-31", "label": "Reconoc.", "color": "#059669" },
    { "id": "other-32", "label": "Imanes", "color": "#0891b2" },
    { "id": "other-33", "label": "Colgantes", "color": "#2563eb" },
    { "id": "other-34", "label": "REVISAR BORLA", "color": "#7e22ce" },
    { "id": "other-35", "label": "Graduación", "color": "#9d174d" },
    { "id": "other-36", "label": "Porta llaves", "color": "#7f1d1d" },
    { "id": "other-37", "label": "Copon", "color": "#b91c1c" },
    { "id": "other-38", "label": "Madre", "color": "#fb923c" }
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


export async function readOtherTags(): Promise<Tag[]> {
  try {
    await fs.access(tagsOtherPath);
  } catch (error) {
    await fs.writeFile(tagsOtherPath, JSON.stringify(initialOtherTags, null, 2), 'utf8');
    return initialOtherTags.tags;
  }

  const fileContent = await fs.readFile(tagsOtherPath, 'utf8');
  if (!fileContent) {
    return initialOtherTags.tags;
  }

  return JSON.parse(fileContent).tags;
}

export async function writeOtherTags(tags: Tag[]): Promise<void> {
    await fs.writeFile(tagsOtherPath, JSON.stringify({ tags }, null, 2), 'utf8');
}
