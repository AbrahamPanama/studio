
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFirestore, addDocumentNonBlocking, storage } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { inventoryItemSchema } from '@/lib/schema';
import type { InventoryItem } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Save, Package, Ruler, MapPin, Image as ImageIcon } from 'lucide-react';
import { ImageUpload } from '@/components/shared/image-upload';

const COMMON_CATEGORIES = ['Vinyl', 'Paper', 'Ink', 'Tools', 'Hardware', 'Office', 'Other'];
const COMMON_UNITS = ['Unit', 'Roll', 'Sheet', 'Box', 'Liter', 'Meter', 'Pack'];

export default function NewInventoryPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();
  const [imageFile, setImageFile] = React.useState<File | null>(null);

  const form = useForm<InventoryItem>({
    resolver: zodResolver(inventoryItemSchema),
    defaultValues: {
      name: '', sku: '', category: 'Vinyl', color: '', thickness: '',
      quantity: 0, unit: 'Unit', minStock: 5, location: '', supplier: '',
      imageUrl: '',
    },
  });

  function onSubmit(data: InventoryItem) {
    if (!firestore || !storage) return;
    startTransition(async () => {
      try {
        let imageUrl = '';

        // 1. Upload Image (if selected)
        if (imageFile) {
          // Create a unique path: inventory/{timestamp}_{filename}
          const storageRef = ref(storage, `inventory/${Date.now()}_${imageFile.name}`);
          const snapshot = await uploadBytes(storageRef, imageFile);
          imageUrl = await getDownloadURL(snapshot.ref);
        }

        // 2. Save Document with Image URL
        await addDocumentNonBlocking(collection(firestore, 'inventory'), {
            ...data,
            imageUrl, // <--- Save the URL
            updatedAt: serverTimestamp(),
        });

        toast({ title: "Success", description: "Item added." });
        router.push('/inventory');
      } catch (error) {
        console.error("Error saving inventory item:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not save item." });
      }
    });
  }

  return (
    <div className="container max-w-3xl mx-auto py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Inventory Item</h1>
          <p className="text-muted-foreground">Register a new consumable.</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5 text-indigo-500" /> Identity</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Item Name</FormLabel><FormControl><Input placeholder="e.g. Oracal 651 Red" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem><FormLabel>Category</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{COMMON_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="sku" render={({ field }) => (
                <FormItem><FormLabel>SKU (Optional)</FormLabel><FormControl><Input placeholder="VIN-001" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ImageIcon className="h-5 w-5 text-pink-500" /> Photo</CardTitle>
            </CardHeader>
            <CardContent>
              <ImageUpload 
                 onChange={(file) => setImageFile(file)} 
                 onClear={() => setImageFile(null)} 
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Ruler className="h-5 w-5 text-emerald-500" /> Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
               <FormField control={form.control} name="color" render={({ field }) => (
                  <FormItem><FormLabel>Color</FormLabel><FormControl><Input placeholder="Matte Red" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="thickness" render={({ field }) => (
                  <FormItem><FormLabel>Thickness/Size</FormLabel><FormControl><Input placeholder="24 inch roll" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5 text-amber-500" /> Stock</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <FormField control={form.control} name="quantity" render={({ field }) => (
                <FormItem><FormLabel>Current Qty</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="unit" render={({ field }) => (
                <FormItem><FormLabel>Unit</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{COMMON_UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="minStock" render={({ field }) => (
                <FormItem><FormLabel>Low Stock Alert</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="sm:col-span-3 grid gap-4 sm:grid-cols-2 pt-2">
                  <FormField control={form.control} name="location" render={({ field }) => (
                      <FormItem><FormLabel>Location</FormLabel><FormControl><Input placeholder="Shelf A" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="supplier" render={({ field }) => (
                      <FormItem><FormLabel>Supplier</FormLabel><FormControl><Input placeholder="Amazon" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit" disabled={isPending} className="min-w-[120px]"><Save className="mr-2 h-4 w-4" /> Save Item</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
