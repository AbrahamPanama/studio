'use client';

import { collection, getDocs, writeBatch, doc, limit, query } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import tagsData from './tags.json';
import otherTagsData from './tags-other.json';
import type { Tag } from './types';

/**
 * Safely initializes the `tags` and `tagsOther` collections in Firestore
 * only if they are empty. This function does not touch any other collections.
 * @param firestore - The Firestore instance.
 * @returns A promise that resolves to a status message.
 */
export const initializeTags = async (firestore: Firestore): Promise<string> => {
  const batch = writeBatch(firestore);
  let tagsInitialized = false;
  let otherTagsInitialized = false;

  // 1. Check and initialize 'tags' collection
  const tagsCollectionRef = collection(firestore, 'tags');
  const tagsQuery = query(tagsCollectionRef, limit(1));
  const tagsSnapshot = await getDocs(tagsQuery);

  if (tagsSnapshot.empty) {
    const shippingTags: Omit<Tag, 'id'>[] = tagsData.tags;
    if (shippingTags && shippingTags.length > 0) {
      shippingTags.forEach(tag => {
        const newDocRef = doc(tagsCollectionRef); // Let Firestore generate ID
        batch.set(newDocRef, tag);
      });
      tagsInitialized = true;
    }
  }

  // 2. Check and initialize 'tagsOther' collection
  const tagsOtherCollectionRef = collection(firestore, 'tagsOther');
  const tagsOtherQuery = query(tagsOtherCollectionRef, limit(1));
  const tagsOtherSnapshot = await getDocs(tagsOtherQuery);

  if (tagsOtherSnapshot.empty) {
    const otherTags: Omit<Tag, 'id'>[] = otherTagsData.tags;
    if (otherTags && otherTags.length > 0) {
      otherTags.forEach(tag => {
        const newDocRef = doc(tagsOtherCollectionRef); // Let Firestore generate ID
        batch.set(newDocRef, tag);
      });
      otherTagsInitialized = true;
    }
  }

  // 3. Commit batch if anything was added
  if (tagsInitialized || otherTagsInitialized) {
    await batch.commit();
    const initialized = [];
    if (tagsInitialized) initialized.push("'tags'");
    if (otherTagsInitialized) initialized.push("'tagsOther'");
    return `Successfully initialized ${initialized.join(' and ')} collection(s).`;
  }

  return 'Tag collections were already populated. No action taken.';
};
