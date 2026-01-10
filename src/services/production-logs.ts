
import {
    collection,
    addDoc,
    deleteDoc,
    doc,
    getDocs,
    query,
    orderBy,
    serverTimestamp
} from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { productionLogSchema } from '@/lib/schema-production';
import type { ProductionLog } from '@/lib/types';

export const useProductionLogsService = () => {
    const db = useFirestore();

    const getCollectionRef = (orderId: string) => collection(db, 'orders', orderId, 'production_logs');

    // Get all logs for an order
    const getByOrder = async (orderId: string): Promise<ProductionLog[]> => {
        if (!db) throw new Error("Firestore not initialized");
        try {
            const q = query(getCollectionRef(orderId), orderBy('dateAdded', 'desc'));
            const snapshot = await getDocs(q);

            return snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    // Convert timestamp to Date if needed
                    dateAdded: data.dateAdded?.toDate ? data.dateAdded.toDate() : (data.dateAdded || new Date()),
                };
            }) as ProductionLog[];
        } catch (error) {
            console.error(`Error fetching production logs for order ${orderId}:`, error);
            throw error;
        }
    };

    // Add a new log entry
    const add = async (orderId: string, data: Omit<ProductionLog, 'id'>): Promise<string> => {
        if (!db) throw new Error("Firestore not initialized");
        // Validate
        const validData = productionLogSchema.omit({ id: true }).parse(data);

        try {
            const docRef = await addDoc(getCollectionRef(orderId), {
                ...validData,
                dateAdded: serverTimestamp(), // Use server timestamp for consistency
            });
            return docRef.id;
        } catch (error) {
            console.error(`Error adding production log for order ${orderId}:`, error);
            throw error;
        }
    };

    // Delete a log entry
    const remove = async (orderId: string, logId: string): Promise<void> => {
        if (!db) throw new Error("Firestore not initialized");
        try {
            await deleteDoc(doc(db, 'orders', orderId, 'production_logs', logId));
        } catch (error) {
            console.error(`Error deleting production log ${logId} for order ${orderId}:`, error);
            throw error;
        }
    };

    return { getByOrder, add, remove };
};
