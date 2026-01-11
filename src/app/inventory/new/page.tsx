'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { InventoryForm } from '@/components/inventory/inventory-form';

export default function NewInventoryPage() {
  const router = useRouter();

  return (
    <div className="container max-w-3xl mx-auto py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Inventory Item</h1>
          <p className="text-muted-foreground">Register a new consumable.</p>
        </div>
      </div>
      <InventoryForm />
    </div>
  );
}
