'use client';

import { collection, doc, writeBatch } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { serverTimestamp } from 'firebase/firestore';

// Import the data from the JSON files
import seedData from './seed-data.json';
import tagsData from './tags.json';
import otherTagsData from './tags-other.json';
import type { Tag } from './types';


export const seedDatabase = async (firestore: Firestore) => {
  const batch = writeBatch(firestore);
  let count = 0;

  // 1. Seed Orders
  const ordersCollection = collection(firestore, 'orders');
  const orders = seedData.orders;
  if (orders && orders.length > 0) {
    orders.forEach((order) => {
      const docRef = doc(ordersCollection); 
      const { id, ...orderData } = order;
      const data = {
          ...orderData,
          fechaIngreso: serverTimestamp(),
          entrega: new Date(order.entrega),
          entregaLimite: new Date(order.entregaLimite),
      };
      batch.set(docRef, data);
      count++;
    });
  } else {
    console.warn('No orders found in seed-data.json');
  }

  // 2. Seed Shipping Tags
  const tagsCollection = collection(firestore, 'tags');
  const shippingTags: Tag[] = tagsData.tags;
  if(shippingTags && shippingTags.length > 0) {
    shippingTags.forEach(tag => {
        // Use the ID from the JSON file if it exists and makes sense, otherwise let firestore generate.
        // For these tags, using the file ID is okay for consistency.
        const docRef = doc(tagsCollection, tag.id);
        batch.set(docRef, { label: tag.label, color: tag.color });
    });
  } else {
    console.warn('No tags found in tags.json');
  }

  // 3. Seed Other Tags
  const tagsOtherCollection = collection(firestore, 'tagsOther');
  const otherTags: Tag[] = otherTagsData.tags;
   if(otherTags && otherTags.length > 0) {
    otherTags.forEach(tag => {
        const docRef = doc(tagsOtherCollection, tag.id);
        batch.set(docRef, { label: tag.label, color: tag.color });
    });
  } else {
    console.warn('No tags found in tags-other.json');
  }


  await batch.commit();

  return count; // Returning only order count for now to keep the toast message simple
};
