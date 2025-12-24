
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
    
    let needsWrite = false;
    let maxOrderNum = 0;

    // First, find the maximum existing order number
    db.orders.forEach(order => {
        if (order && order.orderNumber) {
            const num = parseInt(order.orderNumber, 10);
            if (num > maxOrderNum) {
                maxOrderNum = num;
            }
        }
    });
    
    // Migrate old tags and assign order numbers if missing
    const orders = db.orders.map(order => {
        if (!order) return null; // handle potential null/undefined entries

        const newOrder = { ...order };

        // Assign order number if it's missing
        if (!newOrder.orderNumber) {
            needsWrite = true;
            maxOrderNum++;
            newOrder.orderNumber = maxOrderNum.toString().padStart(6, '0');
        }

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
        
        if (!newOrder.id) {
            newOrder.id = `temp-id-${Math.random()}`;
            console.warn("Order found without ID, temporary ID assigned:", newOrder.name);
        }

        return newOrder as Order;
    }).filter((order): order is Order => order !== null);
    
    // If we had to add any order numbers, write the changes back to the DB
    if (needsWrite) {
        await writeDb({ orders: orders });
    }

    return orders;
}

export async function getOrderById(id: string): Promise<Order | null> {
    await delay(300);
    const db = await readDb();
    let order = db.orders.find(o => o.id === id);
    if (!order) {
        return null;
    }

    // Back-fill order number if missing
    if (!order.orderNumber) {
        // This is a rare case, ideally getOrders() would have fixed it.
        // We'll assign a temporary one but won't save it here to avoid race conditions.
        // The main list view is the source of truth for back-filling.
        const maxOrderNum = db.orders.reduce((max, o) => Math.max(max, o.orderNumber ? parseInt(o.orderNumber, 10) : 0), 0);
        order.orderNumber = (maxOrderNum + 1).toString().padStart(6, '0');
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

export async function createOrder(data: z.infer<typeof orderSchema>): Promise<{ id: string }> {
    await delay(500);
    const validatedFields = orderSchema.safeParse(data);
    if (!validatedFields.success) {
        console.error('Validation errors:', validatedFields.error.flatten().fieldErrors);
        throw new Error("Invalid data provided to createOrder action.");
    }
    
    const db = await readDb();

    // Generate new progressive order number
    const maxOrderNumber = db.orders.reduce((max, order) => {
        const currentNum = order.orderNumber ? parseInt(order.orderNumber, 10) : 0;
        return currentNum > max ? currentNum : max;
    }, 0);
    const newOrderNumber = (maxOrderNumber + 1).toString().padStart(6, '0');
    
    const newOrder: Order = {
        ...validatedFields.data,
        id: String(Date.now()),
        orderNumber: newOrderNumber,
        fechaIngreso: new Date(),
        productos: validatedFields.data.productos.map((p, i) => ({...p, id: `p${Date.now()}${i}`})),
        createdBy: validatedFields.data.createdBy,
    };
    
    db.orders.unshift(newOrder);
    await writeDb(db);
    
    revalidatePath('/');
    
    return { id: newOrder.id };
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
    
    // We parse against a partial schema first for flexibility, then merge with the original
    const partialSchema = orderSchema.partial();
    const validatedPartial = partialSchema.safeParse(data);

     if (!validatedPartial.success) {
        console.error('Validation errors on update:', validatedPartial.error.flatten().fieldErrors);
        throw new Error("Invalid data provided to updateOrder action.");
    }
    
    const finalOrderData: Order = {
        ...originalOrder,
        ...validatedPartial.data,
        id: originalOrder.id, // Ensure original ID is preserved
        orderNumber: originalOrder.orderNumber, // Ensure original order number is preserved
        fechaIngreso: originalOrder.fechaIngreso, // Preserve original creation date
        createdBy: originalOrder.createdBy, // Preserve original creator
    };

    db.orders[index] = finalOrderData;
    
    await writeDb(db);
    
    revalidatePath('/');
    revalidatePath(`/orders/${id}/edit`);
    revalidatePath(`/quotes/${id}/edit`);
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

    

    