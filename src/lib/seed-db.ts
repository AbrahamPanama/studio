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
    // FIX: Create a new document reference to let Firestore generate a unique ID.
    const docRef = doc(ordersCollection); 
    
    const { id, ...orderData } = order; // Remove the placeholder ID from the data payload.

    const data = {
        ...orderData,
        fechaIngreso: serverTimestamp(),
        entrega: new Date(order.entrega),
        entregaLimite: new Date(order.entregaLimite),
    };

    batch.set(docRef, data);
    count++;
  });

  await batch.commit();

  return count;
};
