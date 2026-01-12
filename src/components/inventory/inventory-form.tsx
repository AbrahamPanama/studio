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
import { Save, Package, Ruler, MapPin, Image as ImageIcon, Loader2, Check, Palette, Scissors } from 'lucide-react';
import { ImageUpload } from '@/components/shared/image-upload';

const COMMON_CATEGORIES = ['Acrylic', 'Cuts', 'Hardware', 'Ink', 'MDF', 'Office', 'Other', 'Paper', 'Plywood', 'PVC', 'ribbons/rope', 'Tools', 'Vinyl', 'Wood'];
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

  // Helper to sanitize numbers
  const sanitizeNumber = (val: any) => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const parsed = parseFloat(val.replace(/[^\d.-]/g, ''));
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const form = useForm<InventoryItem>({
    resolver: zodResolver(inventoryItemSchema),
    defaultValues: initialData ? {
      ...initialData,
      quantity: sanitizeNumber(initialData.quantity),
      minStock: sanitizeNumber(initialData.minStock),
      width: sanitizeNumber(initialData.width),
      length: sanitizeNumber(initialData.length),
      thickness: sanitizeNumber(initialData.thickness),
    } : {
      name: '', sku: '', category: 'Acrylic', color: '',
      quantity: 0, unit: 'Unit', minStock: 5, location: '', supplier: '',
      imageUrl: '',
    },
  });

  // Watch category to toggle UI
  const category = form.watch('category');
  const isCut = category === 'Cuts';

  async function onSubmit(data: InventoryItem) {
    if (!firestore || !storage) return;

    startTransition(async () => {
      try {
        let imageUrl = data.imageUrl || '';

        // Upload image
        if (imageFile) {
          try {
            const compressedFile = await compressImage(imageFile);
            const storageRef = ref(storage, `inventory/${Date.now()}_${compressedFile.name}`);
            const snapshot = await uploadBytes(storageRef, compressedFile);
            imageUrl = await getDownloadURL(snapshot.ref);
          } catch (uploadError) {
            toast({ variant: "destructive", title: "Image Error", description: "Could not upload image." });
            return;
          }
        }

        // --- FIXED PAYLOAD ---
        const payload = {
          ...data,
          quantity: Number(data.quantity),
          minStock: Number(data.minStock),

          // Logic for Cuts vs Standard
          // FIX: Use 'null' instead of 'undefined' for missing values
          sku: isCut ? '' : (data.sku || ''),
          width: isCut ? 0 : (data.width ? Number(data.width) : null),
          length: isCut ? 0 : (data.length ? Number(data.length) : null),
          thickness: isCut ? 0 : (data.thickness ? Number(data.thickness) : null),

          color: isCut ? '' : (data.color || null),
          imageUrl: imageUrl,

          updatedAt: serverTimestamp(),
        };

        if (initialData && id) {
          await updateDocumentNonBlocking(doc(firestore, 'inventory', id), payload);
          toast({ title: "Updated", description: "Item updated successfully." });
        } else {
          await addDocumentNonBlocking(collection(firestore, 'inventory'), payload);
          toast({ title: "Created", description: "Item added to inventory." });
        }

        router.push('/inventory');
        router.refresh();
      } catch (error) {
        console.error("Save failed:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not save item. Check console for details." });
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

        {/* --- IDENTITY CARD --- */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isCut ? <Scissors className="h-5 w-5 text-orange-500" /> : <Package className="h-5 w-5 text-indigo-500" />}
              {isCut ? "Cut Details" : "Identity"}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>{isCut ? "Descriptive Name" : "Item Name"}</FormLabel>
                  <FormControl><Input placeholder={isCut ? "e.g. Scrap White Acrylic 10x10" : "e.g. Oracal 651 Red"} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="category" render={({ field }) => (
              <FormItem><FormLabel>Category</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{COMMON_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
            )} />

            {!isCut && (
              <FormField control={form.control} name="sku" render={({ field }) => (
                <FormItem><FormLabel>SKU (Optional)</FormLabel><FormControl><Input placeholder="VIN-001" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            )}
          </CardContent>
        </Card>

        {/* --- PHOTO CARD --- */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ImageIcon className="h-5 w-5 text-pink-500" /> Photo</CardTitle></CardHeader>
          <CardContent>
            <ImageUpload value={form.watch('imageUrl')} onChange={(file) => setImageFile(file)} onClear={() => { setImageFile(null); form.setValue('imageUrl', ''); }} />
          </CardContent>
        </Card>

        {/* --- DETAILS CARD (Hidden for Cuts) --- */}
        {!isCut && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Ruler className="h-5 w-5 text-emerald-500" /> Details & Dimensions</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <FormField control={form.control} name="color" render={({ field }) => (
                <FormItem>
                  <FormLabel>Color / Finish</FormLabel>
                  <FormControl>
                    <div className="space-y-4">
                      <div className="grid grid-cols-[repeat(14,minmax(0,1fr))] gap-2 w-fit">
                        {INVENTORY_COLORS.map((c) => (
                          <button key={c.value} type="button" onClick={() => field.onChange(c.value)} style={c.style}
                            className={cn("h-8 w-8 rounded-full border shadow-sm transition-all flex items-center justify-center", field.value === c.value ? "ring-2 ring-indigo-600 ring-offset-2 scale-110" : "hover:scale-110")}
                          >
                            {field.value === c.value && <Check className={cn("h-4 w-4", (c.value === 'White' || c.value === 'Transparent') ? "text-black" : "text-white")} />}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-3 p-3 border rounded-md bg-slate-50 max-w-md">
                        <Palette className="h-5 w-5 text-muted-foreground" />
                        <div className="relative h-8 w-8 overflow-hidden rounded-full border shadow-sm cursor-pointer">
                          <input type="color" className="absolute -top-2 -left-2 h-12 w-12 cursor-pointer" onChange={(e) => field.onChange(e.target.value)} value={field.value?.startsWith('#') ? field.value : '#000000'} />
                        </div>
                        <Input placeholder="Custom Name or Hex" value={field.value || ''} onChange={field.onChange} className="flex-1 h-8 bg-white" />
                      </div>
                    </div>
                  </FormControl>
                </FormItem>
              )} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-2">
                  <FormLabel>Dimensions (W x L)</FormLabel>
                  <div className="flex gap-2 items-center">
                    <FormField control={form.control} name="width" render={({ field }) => (
                      <FormItem className="flex-1"><FormControl><Input type="number" step="0.01" placeholder="Width" {...field} /></FormControl></FormItem>
                    )} />
                    <span className="text-muted-foreground font-bold">x</span>
                    <FormField control={form.control} name="length" render={({ field }) => (
                      <FormItem className="flex-1"><FormControl><Input type="number" step="0.01" placeholder="Length" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="dimensionUnit" render={({ field }) => (
                      <FormItem className="w-[85px]"><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{DIMENSION_UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select></FormItem>
                    )} />
                  </div>
                </div>
                <div className="space-y-2">
                  <FormLabel>Thickness</FormLabel>
                  <div className="flex gap-2 items-center">
                    <FormField control={form.control} name="thickness" render={({ field }) => (
                      <FormItem className="flex-1"><FormControl><Input type="number" step="0.01" placeholder="Value" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="thicknessUnit" render={({ field }) => (
                      <FormItem className="w-[85px]"><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{THICKNESS_UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select></FormItem>
                    )} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* --- STOCK CARD --- */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5 text-amber-500" /> Stock</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <FormField control={form.control} name="quantity" render={({ field }) => (
              <FormItem><FormLabel>{isCut ? "Amount / Qty" : "Current Qty"}</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
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

              {!isCut && (
                <FormField control={form.control} name="supplier" render={({ field }) => (
                  <FormItem><FormLabel>Supplier</FormLabel><FormControl><Input placeholder="Amazon" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              )}
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
