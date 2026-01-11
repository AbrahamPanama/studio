
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
import { INVENTORY_COLORS } from '@/lib/constants';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, Package, Ruler, MapPin, Image as ImageIcon, Loader2, Check, Palette } from 'lucide-react';
import { ImageUpload } from '@/components/shared/image-upload';

const COMMON_CATEGORIES = [
  'Vinyl', 'Paper', 'MDF', 'Acrylic', 'Plywood', 'PVC', 'Wood', 'Cuts',
  'Ink', 'Tools', 'Hardware', 'Office', 'Other'
];
const COMMON_UNITS = ['Unit', 'Roll', 'Sheet', 'Box', 'Liter', 'Meter', 'Pack'];
const DIMENSION_UNITS = ['inch', 'cm', 'mm', 'yrds'];
const THICKNESS_UNITS = ['inch', 'mm'];

interface InventoryFormProps {
  initialData?: InventoryItem;
  id?: string;
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
      name: '',
      sku: '',
      category: 'Vinyl',
      color: '',
      width: undefined,
      length: undefined,
      dimensionUnit: 'inch',
      thickness: undefined,
      thicknessUnit: 'mm',
      quantity: 0,
      unit: 'Unit',
      minStock: 5,
      location: '',
      supplier: '',
      imageUrl: '',
    },
  });

  async function onSubmit(data: InventoryItem) {
    if (!firestore || !storage) return;

    startTransition(async () => {
      try {
        let imageUrl = data.imageUrl || '';

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

        const payload = { ...data, imageUrl, updatedAt: serverTimestamp() };

        if (initialData && id) {
          updateDocumentNonBlocking(doc(firestore, 'inventory', id), payload);
          toast({ title: "Updated", description: "Item updated successfully." });
        } else {
          addDocumentNonBlocking(collection(firestore, 'inventory'), payload);
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
            <CardTitle className="flex items-center gap-2"><Ruler className="h-5 w-5 text-emerald-500" /> Details & Dimensions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
             
             {/* Color Picker */}
             <FormField control={form.control} name="color" render={({ field }) => (
                <FormItem>
                  <FormLabel>Color / Finish</FormLabel>
                  <FormControl>
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-3">
                        {INVENTORY_COLORS.map((c) => (
                          <button
                            key={c.value}
                            type="button"
                            onClick={() => field.onChange(c.value)}
                            style={c.style}
                            className={cn(
                              "h-10 w-10 rounded-full cursor-pointer flex items-center justify-center transition-all relative shadow-sm",
                              field.value === c.value 
                                ? "ring-2 ring-offset-2 ring-indigo-600 scale-110 shadow-md" 
                                : "hover:scale-105"
                            )}
                            title={c.label}
                          >
                             {field.value === c.value && (
                               <Check className={cn("h-5 w-5", (c.value === 'White' || c.value === 'Cream' || c.value === 'Transparent' || c.value === 'Frost' || c.value === 'Baby Pink' || c.value === 'Mint') ? "text-black" : "text-white drop-shadow-md")} />
                             )}
                          </button>
                        ))}
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 border rounded-md bg-slate-50">
                        <Palette className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm font-medium text-slate-700">Custom:</span>
                        <div className="relative h-9 w-9 overflow-hidden rounded-full border shadow-sm cursor-pointer group">
                            <input 
                                type="color" 
                                className="absolute -top-2 -left-2 h-16 w-16 cursor-pointer"
                                onChange={(e) => field.onChange(e.target.value)}
                                value={field.value?.startsWith('#') ? field.value : '#000000'}
                            />
                        </div>
                        <Input 
                            placeholder="e.g. Neon Pink or #FF00FF" 
                            value={field.value || ''} 
                            onChange={field.onChange}
                            className="flex-1 bg-white" 
                        />
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* --- DIMENSIONS ROW --- */}
              <div className="space-y-4">
                <div className="flex gap-4 items-end">
                    <FormField control={form.control} name="width" render={({ field }) => (
                      <FormItem className="flex-1"><FormLabel>Width</FormLabel><FormControl><Input type="number" step="0.01" placeholder="4" {...field} /></FormControl></FormItem>
                    )} />
                    <span className="pb-3 text-muted-foreground font-bold">x</span>
                    <FormField control={form.control} name="length" render={({ field }) => (
                      <FormItem className="flex-1"><FormLabel>Length</FormLabel><FormControl><Input type="number" step="0.01" placeholder="8" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="dimensionUnit" render={({ field }) => (
                      <FormItem className="w-[100px]"><FormLabel>Unit</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>{DIMENSION_UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                </div>

                {/* --- THICKNESS ROW --- */}
                <div className="flex gap-4 items-end max-w-[300px]">
                   <FormField control={form.control} name="thickness" render={({ field }) => (
                      <FormItem className="flex-1"><FormLabel>Thickness</FormLabel><FormControl><Input type="number" step="0.1" placeholder="3" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="thicknessUnit" render={({ field }) => (
                      <FormItem className="w-[100px]"><FormLabel>Unit</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>{THICKNESS_UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                </div>
              </div>

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
