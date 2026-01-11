
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking, storage } from '@/firebase';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { inventoryItemSchema } from '@/lib/schema';
import type { InventoryItem } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { compressImage, cn } from '@/lib/utils';
import { INVENTORY_COLORS } from '@/lib/constants'; // <--- IMPORT THIS

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, Package, Ruler, MapPin, Image as ImageIcon, Loader2, Check } from 'lucide-react';
import { ImageUpload } from '@/components/shared/image-upload';

// Updated Categories per your request
const COMMON_CATEGORIES = [
  'Vinyl', 'Paper', 'MDF', 'Acrylic', 'Plywood', 'PVC', 'Wood', 'Cuts',
  'Ink', 'Tools', 'Hardware', 'Office', 'Other'
];
const COMMON_UNITS = ['Unit', 'Roll', 'Sheet', 'Box', 'Liter', 'Meter', 'Pack'];

interface InventoryFormProps {
  initialData?: InventoryItem; // If present, we are editing
  id?: string;                 // The doc ID (required for editing)
}

export function InventoryForm({ initialData, id }: InventoryFormProps) {
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();
  const [imageFile, setImageFile] = React.useState<File | null>(null);

  const form = useForm<InventoryItem>({
    resolver: zodResolver(inventoryItemSchema),
    defaultValues: initialData || {
      name: '', sku: '', category: 'Vinyl', color: '', thickness: '',
      quantity: 0, unit: 'Unit', minStock: 5, location: '', supplier: '',
      imageUrl: '',
    },
  });

  async function onSubmit(data: InventoryItem) {
    if (!firestore || !storage) return;

    startTransition(async () => {
      try {
        let imageUrl = data.imageUrl || '';

        // 1. Handle Image Upload (if new file selected)
        if (imageFile) {
          try {
            const compressedFile = await compressImage(imageFile);
            const storageRef = ref(storage, `inventory/${Date.now()}_${compressedFile.name}`);
            const snapshot = await uploadBytes(storageRef, compressedFile);
            imageUrl = await getDownloadURL(snapshot.ref);
          } catch (uploadError) {
            console.error("Upload failed", uploadError);
            toast({ variant: "destructive", title: "Image Error", description: "Could not upload image." });
            return;
          }
        }

        // 2. Save or Update
        if (initialData && id) {
          // UPDATE EXISTING
          const docRef = doc(firestore, 'inventory', id);
          updateDocumentNonBlocking(docRef, {
            ...data,
            imageUrl,
            updatedAt: serverTimestamp(),
          });
          toast({ title: "Updated", description: "Item updated successfully." });
        } else {
          // CREATE NEW
          addDocumentNonBlocking(collection(firestore, 'inventory'), {
            ...data,
            imageUrl,
            updatedAt: serverTimestamp(),
          });
          toast({ title: "Created", description: "Item added to inventory." });
        }

        router.push('/inventory');
        router.refresh();
      } catch (error) {
        console.error(error);
        toast({ variant: "destructive", title: "Error", description: "Could not save item." });
      }
    });
  }

  return (
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
               value={form.watch('imageUrl')}
               onChange={(file) => setImageFile(file)} 
               onClear={() => { setImageFile(null); form.setValue('imageUrl', ''); }} 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Ruler className="h-5 w-5 text-emerald-500" /> Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-1">
             {/* --- NEW COLOR PICKER --- */}
             <FormField control={form.control} name="color" render={({ field }) => (
                <FormItem>
                  <FormLabel>Color / Finish</FormLabel>
                  <FormControl>
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {INVENTORY_COLORS.map((c) => (
                          <div
                            key={c.value}
                            onClick={() => field.onChange(c.value)}
                            className={cn(
                              "h-8 w-8 rounded-full cursor-pointer shadow-sm flex items-center justify-center transition-all hover:scale-110 active:scale-95",
                              c.class,
                              field.value === c.value ? "ring-2 ring-offset-2 ring-indigo-500 scale-110" : "hover:ring-2 hover:ring-offset-1 hover:ring-slate-300"
                            )}
                            title={c.label}
                          >
                             {field.value === c.value && <Check className={cn("h-4 w-4", c.value === 'White' || c.value === 'Transparent' || c.value === 'Frost' ? "text-black" : "text-white")} />}
                          </div>
                        ))}
                      </div>
                      {/* Fallback Text Input for custom colors */}
                      <Input 
                        placeholder="Or type a custom color..." 
                        value={field.value || ''} 
                        onChange={field.onChange}
                        className="max-w-xs" 
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              {/* ------------------------ */}

              <FormField control={form.control} name="thickness" render={({ field }) => (
                <FormItem><FormLabel>Thickness/Size</FormLabel><FormControl><Input placeholder="24 inch roll, 3mm" {...field} /></FormControl><FormMessage /></FormItem>
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
          <Button type="submit" disabled={isPending} className="min-w-[120px]">
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {initialData ? 'Update Item' : 'Save Item'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
