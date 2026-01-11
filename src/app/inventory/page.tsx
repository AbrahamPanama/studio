
'use client';

import * as React from 'react';
import { useFirestore } from '@/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import type { InventoryItem } from '@/lib/types';
import Link from 'next/link';

export default function InventoryPage() {
  const firestore = useFirestore();
  const [items, setItems] = React.useState<InventoryItem[]>([]);
  const [search, setSearch] = React.useState('');

  React.useEffect(() => {
    if (!firestore) return;
    const q = query(collection(firestore, 'inventory'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem));
      setItems(data);
    });
    return () => unsubscribe();
  }, [firestore]);

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.sku?.toLowerCase().includes(search.toLowerCase()) ||
    item.color?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground">Manage your consumables and stock.</p>
        </div>
        <Button asChild>
          <Link href="/inventory/new">
            <Plus className="mr-2 h-4 w-4" /> Add Item
          </Link>
        </Button>
      </div>

      <div className="flex items-center space-x-2 bg-white p-2 rounded-md border shadow-sm w-full sm:w-80">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search items..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)}
          className="border-0 focus-visible:ring-0"
        />
      </div>

      <div className="rounded-md border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Supplier</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.map((item) => {
              const isLowStock = item.quantity <= (item.minStock || 0);
              return (
                <TableRow key={item.id}>
                  <TableCell>
                    {item.imageUrl ? (
                      <div className="h-12 w-12 rounded-md overflow-hidden border bg-slate-100">
                        <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className="h-12 w-12 rounded-md bg-slate-100 flex items-center justify-center text-slate-300">
                        <ImageIcon className="h-6 w-6" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{item.name}</span>
                      <span className="text-xs text-muted-foreground">{item.sku}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                       {item.color && <Badge variant="outline" className="text-xs bg-slate-50">{item.color}</Badge>}
                       {item.thickness && <Badge variant="outline" className="text-xs bg-slate-50">{item.thickness}</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={isLowStock ? "text-red-600 font-bold" : ""}>
                        {item.quantity} {item.unit}
                      </span>
                      {isLowStock && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                    </div>
                  </TableCell>
                  <TableCell>{item.location || '-'}</TableCell>
                  <TableCell>{item.supplier || '-'}</TableCell>
                </TableRow>
              );
            })}
            {filteredItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No items found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
