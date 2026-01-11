'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useDoc } from '@/firebase/firestore/use-doc';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { InventoryForm } from '@/components/inventory/inventory-form';
import type { InventoryItem } from '@/lib/types';

export default function EditInventoryPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const firestore = useFirestore();
  
  // Fetch existing data
  const docRef = useMemoFirebase(() => firestore ? doc(firestore, 'inventory', id) : null, [firestore, id]);
  const { data, isLoading } = useDoc<InventoryItem>(docRef);

  if (isLoading) {
    return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!data) {
    return <div className="p-8 text-center">Item not found.</div>;
  }

  return (
    <div className="container max-w-3xl mx-auto py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Item</h1>
          <p className="text-muted-foreground">Update details or adjust stock.</p>
        </div>
      </div>
      <InventoryForm initialData={data} id={id} />
    </div>
  );
}
