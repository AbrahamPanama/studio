'use client';

import { collection, doc, writeBatch } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import seedData from './seed-data.json';
import { serverTimestamp } from 'firebase/firestore';

export const seedDatabase = async (firestore: Firestore) => {
  const ordersCollection = collection(firestore, 'orders');
  const batch = writeBatch(firestore);

  let count = 0;
  const orders = seedData.orders;

  if (!orders || orders.length === 0) {
    throw new Error('No orders found in seed-data.json');
  }

  orders.forEach((order) => {
    // Make sure to use the ID from the JSON file for the document ID
    const docRef = doc(ordersCollection, order.id);
    
    const data = {
        ...order,
        // Convert string dates from JSON to Firestore Timestamps or Date objects
        fechaIngreso: serverTimestamp(), // Set current date for seeded data
        entrega: new Date(order.entrega),
        entregaLimite: new Date(order.entregaLimite),
    };

    // We remove the 'id' field from the data payload itself, as it's used as the doc key
    delete (data as any).id;

    batch.set(docRef, data);
    count++;
  });

  await batch.commit();

  return count;
};
