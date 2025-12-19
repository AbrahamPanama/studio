'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import type { Order, Tag } from '@/lib/types';
import { orderSchema, tagSchema } from '@/lib/schema';
import { readDb, writeDb, readTags, writeTags } from '@/lib/db';


const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function getOrders() {
    await delay(300);
    const db = await readDb();
    
    // Migrate old tags to new tags array
    const orders = db.orders.map(order => {
        if (!order.tags) {
            const newTags = [];
            if (order.customTag1) newTags.push(order.customTag1);
            if (order.customTag2) newTags.push(order.customTag2);
            if (order.customTag3) newTags.push(order.customTag3);
            if (order.customTag4) newTags.push(order.customTag4);
            return { ...order, tags: newTags };
        }
        return order;
    })
    
    return orders;
}

export async function getOrderById(id: string) {
    await delay(300);
    const db = await readDb();
    let order = db.orders.find(o => o.id === id);
    if (!order) {
        return null;
    }
    // Migrate old tags to new tags array
    if (!order.tags) {
        const newTags = [];
        if (order.customTag1) newTags.push(order.customTag1);
        if (order.customTag2) newTags.push(order.customTag2);
        if (order.customTag3) newTags.push(order.customTag3);
        if (order.customTag4) newTags.push(order.customTag4);
        order.tags = newTags;
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

export async function updateOrder(id: string, data: Partial<z.infer<typeof orderSchema>>) {
    await delay(500);
    
    const db = await readDb();
    const index = db.orders.findIndex(o => o.id === id);

    if (index === -1) {
        throw new Error('Order not found');
    }

    const originalOrder = db.orders[index];

    // No need to parse the whole schema, just merge the fields
    const updatedOrder = {
        ...originalOrder,
        ...data,
        productos: data.productos 
            ? data.productos.map((p, i) => ({...p, id: p.id || `p${Date.now()}${i}`}))
            : originalOrder.productos,
    };
    
    const validatedFields = orderSchema.safeParse(updatedOrder);
     if (!validatedFields.success) {
        console.error('Validation errors:', validatedFields.error.flatten().fieldErrors);
        throw new Error("Invalid data provided to updateOrder action.");
    }

    db.orders[index] = validatedFields.data;
    
    await writeDb(db);
    
    revalidatePath('/');
    revalidatePath(`/orders/${id}/edit`);
    revalidatePath('/dashboard');
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

// Tag Actions
export async function getTags() {
    await delay(100);
    return await readTags();
}

export async function updateTags(tags: Tag[]) {
    await delay(300);
    const validatedTags = z.array(tagSchema).safeParse(tags);
    if (!validatedTags.success) {
        throw new Error("Invalid data provided to updateTags action.");
    }
    await writeTags(validatedTags.data);
    revalidatePath('/');
    revalidatePath('/dashboard');
}
