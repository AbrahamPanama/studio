
import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDocs,
    query,
    orderBy,
    serverTimestamp
} from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { resourceItemSchema } from '@/lib/schema-production';
import type { ResourceItem } from '@/lib/types';

const COLLECTION_NAME = 'resources';

export const useResourcesService = () => {
    const db = useFirestore();

    // Get all resources
    const getAll = async (): Promise<ResourceItem[]> => {
        if (!db) throw new Error("Firestore not initialized");
        try {
            const q = query(collection(db, COLLECTION_NAME), orderBy('name'));
            const snapshot = await getDocs(q);

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as ResourceItem[];
        } catch (error) {
            console.error('Error fetching resources:', error);
            throw error;
        }
    };

    // Add a new resource
    const add = async (data: Omit<ResourceItem, 'id'>): Promise<string> => {
        if (!db) throw new Error("Firestore not initialized");
        // Validate before sending (double safety)
        const validData = resourceItemSchema.omit({ id: true }).parse(data);

        try {
            const docRef = await addDoc(collection(db, COLLECTION_NAME), {
                ...validData,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            return docRef.id;
        } catch (error) {
            console.error('Error adding resource:', error);
            throw error;
        }
    };

    // Update a resource
    const update = async (id: string, data: Partial<Omit<ResourceItem, 'id'>>): Promise<void> => {
        if (!db) throw new Error("Firestore not initialized");
        try {
            const docRef = doc(db, COLLECTION_NAME, id);
            await updateDoc(docRef, {
                ...data,
                updatedAt: serverTimestamp(),
            });
        } catch (error) {
            console.error('Error updating resource:', error);
            throw error;
        }
    };

    // Delete a resource
    const remove = async (id: string): Promise<void> => {
        if (!db) throw new Error("Firestore not initialized");
        try {
            await deleteDoc(doc(db, COLLECTION_NAME, id));
        } catch (error) {
            console.error('Error deleting resource:', error);
            throw error;
        }
    };

    return { getAll, add, update, remove };
};
