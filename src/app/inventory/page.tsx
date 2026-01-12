'use client';

import * as React from 'react';
import { useFirestore, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, onSnapshot, query, orderBy, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'; // <--- Import Tabs
import {
  Plus, Search, AlertTriangle, Edit, Trash2, Image as ImageIcon,
  Minus, PlusCircle, ArrowUpDown, ArrowUp, ArrowDown, Scissors, Package
} from 'lucide-react';
import type { InventoryItem } from '@/lib/types';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/language-context';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { INVENTORY_COLORS } from '@/lib/constants';

type SortConfig = { key: keyof InventoryItem; direction: 'asc' | 'desc'; };

export default function InventoryPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [items, setItems] = React.useState<InventoryItem[]>([]);
  const [search, setSearch] = React.useState('');
  const [sortConfig, setSortConfig] = React.useState<SortConfig>({ key: 'name', direction: 'asc' });
  const [isPending, startTransition] = React.useTransition();

  React.useEffect(() => {
    if (!firestore) return;
    const q = query(collection(firestore, 'inventory'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem));
      setItems(data);
    });
    return () => unsubscribe();
  }, [firestore]);

  const handleDelete = (id: string) => {
    if (!firestore) return;
    try {
      deleteDocumentNonBlocking(doc(firestore, 'inventory', id));
      toast({ title: t('deleted'), description: t('itemRemoved') });
    } catch (err) {
      toast({ variant: "destructive", title: t('toastError'), description: t('deleteItemFailed') });
    }
  };

  const handleStockChange = (item: InventoryItem, amount: number) => {
    if (!firestore || !item.id) return;
    startTransition(() => {
      const newQuantity = (item.quantity || 0) + amount;
      if (newQuantity < 0) return toast({ variant: "destructive", title: t('invalid'), description: t('negativeStock') });
      updateDocumentNonBlocking(doc(firestore, 'inventory', item.id), { quantity: newQuantity });
    });
  };

  const handleSort = (key: keyof InventoryItem) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // --- SPLIT ITEMS LOGIC ---
  const filteredItems = React.useMemo(() => {
    return items.filter(item =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku?.toLowerCase().includes(search.toLowerCase()) ||
      item.color?.toLowerCase().includes(search.toLowerCase()) ||
      item.category?.toLowerCase().includes(search.toLowerCase())
    );
  }, [items, search]);

  const sortItems = (list: InventoryItem[]) => {
    return [...list].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal === bVal) return 0;
      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      return sortConfig.direction === 'asc' ? 1 : -1;
    });
  };

  const standardItems = sortItems(filteredItems.filter(i => i.category !== 'Cuts'));
  const cutsItems = sortItems(filteredItems.filter(i => i.category === 'Cuts'));

  const SortIcon = ({ columnKey }: { columnKey: keyof InventoryItem }) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown className="ml-2 h-3 w-3 text-muted-foreground/30" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-3 w-3" /> : <ArrowDown className="ml-2 h-3 w-3" />;
  };

  const headerClass = "cursor-pointer hover:bg-slate-50 transition-colors select-none group";

  // --- RENDER TABLE ROW (Reusable) ---
  const renderRow = (item: InventoryItem, isCut: boolean) => {
    const isLowStock = item.quantity <= (item.minStock || 0);
    const colorConfig = INVENTORY_COLORS.find(c => c.value === item.color);
    const isHex = item.color?.startsWith('#');
    const finalStyle = colorConfig?.style || (isHex ? { backgroundColor: item.color, border: '1px solid #cbd5e1' } : { backgroundColor: '#e2e8f0' });

    const dimString = (item.width && item.length) ? `${item.width} x ${item.length} ${item.dimensionUnit || 'inch'}` : null;
    const isNumericThickness = typeof item.thickness === 'number';
    const thickString = item.thickness ? (isNumericThickness ? `${item.thickness} ${item.thicknessUnit || 'mm'}` : item.thickness) : null;

    return (
      <TableRow key={item.id}>
        <TableCell>
          {item.imageUrl ? (
            <Popover>
              <PopoverTrigger asChild>
                <div className="h-10 w-10 rounded-md overflow-hidden border bg-slate-100 cursor-zoom-in">
                  <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0"><img src={item.imageUrl} alt={item.name} className="w-full h-auto rounded-md" /></PopoverContent>
            </Popover>
          ) : <div className="h-10 w-10 rounded-md bg-slate-50 border flex items-center justify-center text-slate-300"><ImageIcon className="h-5 w-5" /></div>}
        </TableCell>

        <TableCell className="font-medium">
          <div className="flex flex-col">
            <span className="text-base">{item.name}</span>
            {!isCut && <span className="text-xs text-muted-foreground">{item.sku}</span>}
            {!isCut && <span className="text-xs text-slate-400">{item.category}</span>}
          </div>
        </TableCell>

        {/* Details Column - Only for Standard */}
        {!isCut && (
          <TableCell>
            <div className="flex flex-col gap-1.5 items-start">
              {item.color && (
                <Badge variant="outline" className="bg-slate-50 border-slate-200 pl-1.5 flex items-center gap-1.5 h-6">
                  <div className="w-3 h-3 rounded-full shadow-sm" style={finalStyle} />
                  {item.color}
                </Badge>
              )}
              {(dimString || thickString) && (
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                  {dimString && <span>{dimString}</span>}
                  {dimString && thickString && <span className="text-slate-300 mx-1">|</span>}
                  {thickString && <span>{thickString}</span>}
                </div>
              )}
            </div>
          </TableCell>
        )}

        <TableCell>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => handleStockChange(item, -1)} disabled={isPending}><Minus className="h-4 w-4" /></Button>
            <div className="flex items-baseline justify-center w-16">
              <span className={cn("font-mono text-lg font-bold", isLowStock ? "text-red-600" : "text-slate-800")}>{item.quantity}</span>
              {!isCut && <span className="text-xs text-muted-foreground ml-1">{item.unit}</span>}
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => handleStockChange(item, 1)} disabled={isPending}><PlusCircle className="h-4 w-4" /></Button>
            {isLowStock && <AlertTriangle className="h-4 w-4 text-amber-500" />}
          </div>
        </TableCell>

        <TableCell className="text-muted-foreground text-sm">{item.location || '-'}</TableCell>

        <TableCell className="text-right">
          <div className="flex justify-end gap-2">
            <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-indigo-600">
              <Link href={`/inventory/${item.id}/edit`}><Edit className="h-4 w-4" /></Link>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600"><Trash2 className="h-4 w-4" /></Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>{t('deleteItemTitle')}</AlertDialogTitle><AlertDialogDescription>{t('deleteItemDesc', { name: item.name })}</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>{t('cancel')}</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(item.id!)} className="bg-destructive hover:bg-destructive/90">{t('delete')}</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('inventory')}</h1>
          <p className="text-muted-foreground">{t('inventoryDesc')}</p>
        </div>
        <Button asChild>
          <Link href="/inventory/new"><Plus className="mr-2 h-4 w-4" /> {t('addItem')}</Link>
        </Button>
      </div>

      <div className="flex items-center space-x-2 bg-white p-2 rounded-md border shadow-sm w-full sm:w-80">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input placeholder={t('searchItems')} value={search} onChange={(e) => setSearch(e.target.value)} className="border-0 focus-visible:ring-0" />
      </div>

      <Tabs defaultValue="materials" className="w-full">
        <TabsList className="grid w-full max-w-[400px] grid-cols-2">
          <TabsTrigger value="materials" className="flex items-center gap-2"><Package className="h-4 w-4" /> {t('standardStock')}</TabsTrigger>
          <TabsTrigger value="cuts" className="flex items-center gap-2"><Scissors className="h-4 w-4" /> {t('cuts')}</TabsTrigger>
        </TabsList>

        {/* --- STANDARD MATERIALS TAB --- */}
        <TabsContent value="materials" className="mt-4">
          <div className="rounded-md border bg-white shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">{t('colImage')}</TableHead>
                  <TableHead className={headerClass} onClick={() => handleSort('name')}><div className="flex items-center">{t('colNameSku')} <SortIcon columnKey="name" /></div></TableHead>
                  <TableHead className={headerClass} onClick={() => handleSort('color')}><div className="flex items-center">{t('colDetails')} <SortIcon columnKey="color" /></div></TableHead>
                  <TableHead className={headerClass} onClick={() => handleSort('quantity')}><div className="flex items-center">{t('colStock')} <SortIcon columnKey="quantity" /></div></TableHead>
                  <TableHead className={headerClass} onClick={() => handleSort('location')}><div className="flex items-center">{t('colLocation')} <SortIcon columnKey="location" /></div></TableHead>
                  <TableHead className="text-right">{t('colActions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {standardItems.length === 0 && <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">{t('noStandardItems')}</TableCell></TableRow>}
                {standardItems.map(item => renderRow(item, false))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* --- CUTS TAB --- */}
        <TabsContent value="cuts" className="mt-4">
          <div className="rounded-md border bg-white shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">{t('colImage')}</TableHead>
                  <TableHead className={headerClass} onClick={() => handleSort('name')}><div className="flex items-center">{t('colDescName')} <SortIcon columnKey="name" /></div></TableHead>
                  <TableHead className={headerClass} onClick={() => handleSort('quantity')}><div className="flex items-center">{t('colAmount')} <SortIcon columnKey="quantity" /></div></TableHead>
                  <TableHead className={headerClass} onClick={() => handleSort('location')}><div className="flex items-center">{t('colLocation')} <SortIcon columnKey="location" /></div></TableHead>
                  <TableHead className="text-right">{t('colActions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cutsItems.length === 0 && <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">{t('noCutsFound')}</TableCell></TableRow>}
                {cutsItems.map(item => renderRow(item, true))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
