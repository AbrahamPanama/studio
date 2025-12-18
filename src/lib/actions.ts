'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import type { Order } from '@/lib/types';
import { orderSchema } from '@/lib/schema';

// Mock database - in a real app, this would be your Firestore client.
let orders: Order[] = [
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
];

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function getOrders() {
    await delay(300);
    return orders.sort((a, b) => b.fechaIngreso.getTime() - a.fechaIngreso.getTime());
}

export async function getOrderById(id: string) {
    await delay(300);
    const order = orders.find(o => o.id === id);
    if (!order) {
        return null;
    }
    // Return a copy to avoid direct mutation of the mock db
    return JSON.parse(JSON.stringify(order));
}

export async function createOrder(data: z.infer<typeof orderSchema>) {
    await delay(500);
    const validatedFields = orderSchema.safeParse(data);
    if (!validatedFields.success) {
        throw new Error("Invalid data provided to createOrder action.");
    }
    
    const newOrder: Order = {
        ...validatedFields.data,
        id: String(Date.now()),
        fechaIngreso: new Date(),
    };
    
    orders.unshift(newOrder);
    revalidatePath('/');
    redirect('/');
}

export async function updateOrder(id: string, data: z.infer<typeof orderSchema>) {
    await delay(500);
    const validatedFields = orderSchema.safeParse(data);
     if (!validatedFields.success) {
        console.error('Validation errors:', validatedFields.error.flatten().fieldErrors);
        throw new Error("Invalid data provided to updateOrder action.");
    }

    const index = orders.findIndex(o => o.id === id);
    if (index === -1) {
        throw new Error('Order not found');
    }

    const originalOrder = orders[index];

    orders[index] = {
        ...originalOrder,
        ...validatedFields.data,
        id: originalOrder.id, // ensure id and fechaIngreso are not overwritten
        fechaIngreso: originalOrder.fechaIngreso,
    };
    
    revalidatePath('/');
    revalidatePath(`/orders/${id}/edit`);
}

export async function deleteOrder(id: string) {
    await delay(500);
    const index = orders.findIndex(o => o.id === id);
    if (index === -1) {
        throw new Error('Order not found');
    }
    orders.splice(index, 1);
    revalidatePath('/');
}
