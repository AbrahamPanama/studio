'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import type { Order, Tag } from '@/lib/types';
import { orderSchema, tagSchema } from '@/lib/schema';
import { readDb, writeDb, readTags, writeTags, readOtherTags, writeOtherTags } from '@/lib/db';


const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function getOrders(): Promise<Order[]> {
    await delay(300);
    const db = await readDb();
    
    // Migrate old tags to new tags array, ensuring id is always preserved.
    const orders = db.orders.map(order => {
        if (!order) return null; // handle potential null/undefined entries

        const newOrder = { ...order };

        if (!newOrder.tags) {
            const newTags: string[] = [];
            if (newOrder.customTag1) newTags.push(newOrder.customTag1);
            if (newOrder.customTag2) newTags.push(newOrder.customTag2);
            if (newOrder.customTag3) newTags.push(newOrder.customTag3);
            if (newOrder.customTag4) newTags.push(newOrder.customTag4);
            newOrder.tags = newTags;
        }

        if (!newOrder.tagsOther) {
            newOrder.tagsOther = [];
        }
        
        // Ensure an ID exists, though the primary fix is in db.json
        if (!newOrder.id) {
            newOrder.id = `temp-id-${Math.random()}`;
            console.warn("Order found without ID, temporary ID assigned:", newOrder.name);
        }

        return newOrder as Order;
    }).filter((order): order is Order => order !== null);
    
    return orders;
}

export async function getOrderById(id: string) {
    await delay(300);
    const db = await readDb();
    let order = db.orders.find(o => o.id === id);
    if (!order) {
        return null;
    }
    // Ensure tags arrays exist
    if (!order.tags) {
        const newTags: string[] = [];
        if (order.customTag1) newTags.push(order.customTag1);
        if (order.customTag2) newTags.push(order.customTag2);
        if (order.customTag3) newTags.push(order.customTag3);
        if (order.customTag4) newTags.push(order.customTag4);
        order.tags = newTags;
    }
    if (!order.tagsOther) {
        order.tagsOther = [];
    }
    return order;
}

export async function createOrder(data: z.infer<typeof orderSchema>) {
    await delay(500);
    const validatedFields = orderSchema.safeParse(data);
    if (!validatedFields.success) {
        console.error('Validation errors:', validatedFields.error.flatten().fieldErrors);
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
    // Redirect is handled client-side in the form component
}

export async function updateOrder(id: string, data: Partial<z.infer<typeof orderSchema>>) {
    await delay(500);
    
    const db = await readDb();
    const index = db.orders.findIndex(o => o.id === id);

    if (index === -1) {
        throw new Error('Order not found');
    }

    const originalOrder = db.orders[index];

    // Merge incoming partial data with existing data
    const mergedData = {
        ...originalOrder,
        ...data,
        // Ensure products have IDs
        productos: data.productos 
            ? data.productos.map((p, i) => ({...p, id: p.id || `p${Date.now()}${i}`}))
            : originalOrder.productos,
        // Ensure tags arrays are always arrays
        tags: data.tags || originalOrder.tags || [],
        tagsOther: data.tagsOther || originalOrder.tagsOther || [],
    };
    
    const validatedFields = orderSchema.safeParse(mergedData);
     if (!validatedFields.success) {
        console.error('Validation errors:', validatedFields.error.flatten().fieldErrors);
        throw new Error("Invalid data provided to updateOrder action.");
    }

    db.orders[index] = {
        ...validatedFields.data,
        id: originalOrder.id, // Ensure original ID is preserved
        fechaIngreso: originalOrder.fechaIngreso, // Preserve original creation date
    };
    
    await writeDb(db);
    
    revalidatePath('/');
    revalidatePath(`/orders/${id}/edit`);
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
}

export async function getOtherTags() {
    await delay(100);
    return await readOtherTags();
}

export async function updateOtherTags(tags: Tag[]) {
    await delay(300);
    const validatedTags = z.array(tagSchema).safeParse(tags);
    if (!validatedTags.success) {
        throw new Error("Invalid data provided to updateOtherTags action.");
    }
    await writeOtherTags(validatedTags.data);
    revalidatePath('/');
}
