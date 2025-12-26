
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

import type { Order, Tag, Product } from '@/lib/types';
import { orderSchema, tagSchema } from '@/lib/schema';

// Helper to convert Firestore Timestamps to serializable format
const serializeObject = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj.toDate) { // Firestore Timestamp check
    return obj.toDate().toISOString();
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeObject);
  }

  const serialized: { [key: string]: any } = {};
  for (const key in obj) {
    serialized[key] = serializeObject(obj[key]);
  }
  return serialized;
};


export async function getOrders(): Promise<Order[]> {
    const ordersSnapshot = await db.collection('orders').orderBy('fechaIngreso', 'desc').get();
    if (ordersSnapshot.empty) {
        return [];
    }
    
    const orders = ordersSnapshot.docs.map(doc => {
        const data = doc.data();
        return serializeObject({
            id: doc.id,
            ...data,
        }) as Order;
    });

    return orders;
}

export async function getOrderById(id: string): Promise<Order | null> {
    const docRef = db.collection('orders').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
        return null;
    }
    
    const data = doc.data();
    if (!data) return null;

    return serializeObject({
        id: doc.id,
        ...data
    }) as Order;
}

export async function createOrder(data: z.infer<typeof orderSchema>): Promise<{ id: string }> {
    const validatedFields = orderSchema.safeParse(data);
    if (!validatedFields.success) {
        console.error('Validation errors:', validatedFields.error.flatten().fieldErrors);
        throw new Error("Invalid data provided to createOrder action.");
    }
    
    // Get the latest order to determine the next order number
    const latestOrderQuery = await db.collection('orders').orderBy('orderNumber', 'desc').limit(1).get();
    let newOrderNumber = 1;
    if (!latestOrderQuery.empty) {
        const latestOrder = latestOrderQuery.docs[0].data();
        newOrderNumber = parseInt(latestOrder.orderNumber, 10) + 1;
    }
    const orderNumberString = newOrderNumber.toString().padStart(6, '0');

    const newOrderData = {
        ...validatedFields.data,
        fechaIngreso: FieldValue.serverTimestamp(),
        orderNumber: orderNumberString,
        productos: validatedFields.data.productos.map(p => ({
          ...p, 
          // No need to generate ID, Firestore subcollections would be better but for now this is fine.
        })),
    };
    
    const docRef = await db.collection('orders').add(newOrderData);
    
    revalidatePath('/');
    
    return { id: docRef.id };
}

export async function updateOrder(id: string, data: Partial<z.infer<typeof orderSchema>>) {
    const docRef = db.collection('orders').doc(id);

    // We parse against a partial schema first for flexibility
    const partialSchema = orderSchema.partial();
    const validatedPartial = partialSchema.safeParse(data);

     if (!validatedPartial.success) {
        console.error('Validation errors on update:', validatedPartial.error.flatten().fieldErrors);
        throw new Error("Invalid data provided to updateOrder action.");
    }

    // Convert dates back to Timestamps if they exist
    const updateData = { ...validatedPartial.data };
    if (updateData.entrega) {
      updateData.entrega = new Date(updateData.entrega);
    }
    if (updateData.entregaLimite) {
      updateData.entregaLimite = new Date(updateData.entregaLimite);
    }

    await docRef.update(updateData);
    
    revalidatePath('/');
    revalidatePath(`/orders/${id}/edit`);
    revalidatePath(`/quotes/${id}/edit`);
}

export async function deleteOrder(id: string) {
    const docRef = db.collection('orders').doc(id);
    await docRef.delete();
    revalidatePath('/');
}

// Tag Actions
async function getTagsCollection(collectionName: string): Promise<Tag[]> {
    const snapshot = await db.collection(collectionName).get();
    if (snapshot.empty) {
        return [];
    }
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tag));
}

async function updateTagsCollection(collectionName: string, tags: Tag[]): Promise<void> {
    const validatedTags = z.array(tagSchema).safeParse(tags);
    if (!validatedTags.success) {
        throw new Error(`Invalid data provided to update ${collectionName} action.`);
    }

    const batch = db.batch();
    const collectionRef = db.collection(collectionName);
    
    // Get all existing tags to delete the ones not in the new list
    const snapshot = await collectionRef.get();
    const existingIds = snapshot.docs.map(doc => doc.id);
    const newIds = validatedTags.data.map(tag => tag.id);
    
    const idsToDelete = existingIds.filter(id => !newIds.includes(id));
    idsToDelete.forEach(id => {
        batch.delete(collectionRef.doc(id));
    });

    // Set/update new tags
    validatedTags.data.forEach(tag => {
        const { id, ...tagData } = tag;
        const docRef = collectionRef.doc(id);
        batch.set(docRef, tagData, { merge: true });
    });

    await batch.commit();
    revalidatePath('/');
}

export async function getTags() {
    return getTagsCollection('tags');
}

export async function updateTags(tags: Tag[]) {
    await updateTagsCollection('tags', tags);
}

export async function getOtherTags() {
    return getTagsCollection('tagsOther');
}

export async function updateOtherTags(tags: Tag[]) {
    await updateTagsCollection('tagsOther', tags);
}
