'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import type { Order } from '@/lib/types';
import { orderSchema } from '@/lib/schema';
import { readDb, writeDb } from '@/lib/db';


const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function getOrders() {
    await delay(300);
    const db = await readDb();
    return db.orders;
}

export async function getOrderById(id: string) {
    await delay(300);
    const db = await readDb();
    const order = db.orders.find(o => o.id === id);
    if (!order) {
        return null;
    }
    return order;
}

export async function createOrder(data: z.infer<typeof orderSchema>) {
    await delay(500);
    const validatedFields = orderSchema.safeParse(data);
    if (!validatedFields.success) {
        throw new Error("Invalid data provided to createOrder action.");
    }
    
    const db = await readDb();
    
    const newOrder: Order = {
        ...validatedFields.data,
        id: String(Date.now()),
        fechaIngreso: new Date(),
        productos: validatedFields.data.productos.map((p, i) => ({...p, id: `p${Date.now()}${i}`}))
    };
    
    db.orders.unshift(newOrder);
    await writeDb(db);
    
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

    const db = await readDb();
    const index = db.orders.findIndex(o => o.id === id);

    if (index === -1) {
        throw new Error('Order not found');
    }

    const originalOrder = db.orders[index];

    db.orders[index] = {
        ...originalOrder,
        ...validatedFields.data,
        productos: validatedFields.data.productos.map((p, i) => ({...p, id: p.id || `p${Date.now()}${i}`})),
    };
    
    await writeDb(db);
    
    revalidatePath('/');
    revalidatePath(`/orders/${id}/edit`);
    redirect('/');
}

export async function deleteOrder(id: string) {
    await delay(500);
    const db = await readDb();
    const index = db.orders.findIndex(o => o.id === id);

    if (index === -1) {
        throw new Error('Order not found');
    }
    db.orders.splice(index, 1);
    await writeDb(db);
    
    revalidatePath('/');
}
