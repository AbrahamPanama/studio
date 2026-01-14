'use client';

import React, { useState, useMemo } from 'react';
import { differenceInDays, formatDistanceToNow } from 'date-fns';
import { Timestamp, doc, collection } from 'firebase/firestore';
import { Check, Copy, Phone, Calendar, Clock, Loader2 } from 'lucide-react';

import { useFirestore, useCollection, updateDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { Order } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Helper to parse dates safely
const parseDate = (dateInput: any): Date => {
  if (!dateInput) return new Date();
  if (dateInput instanceof Date) return dateInput;
  if (typeof dateInput.toDate === 'function') return dateInput.toDate();
  if (dateInput.seconds) return new Date(dateInput.seconds * 1000);
  return new Date(dateInput);
};

export function FollowUpDashboard() {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const ordersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'orders');
  }, [firestore]);

  const { data: orders, isLoading } = useCollection<Order>(ordersQuery);
  
  const [daysThreshold, setDaysThreshold] = useState(5);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  // Logic: 
  // 1. Must be a Quote (Cotización)
  // 2. Must be older than X days
  // 3. Must NOT have been followed up recently (within the same X days)
  const actionableQuotes = useMemo(() => {
    if (!orders) return [];
    
    const now = new Date();
    
    return orders
      .filter(o => o.estado === 'Cotización')
      .filter(o => {
        const createdDate = parseDate(o.fechaIngreso);
        const daysSinceCreation = differenceInDays(now, createdDate);
        
        // If it's too new, skip it
        if (daysSinceCreation < daysThreshold) return false;

        // If we already followed up recently, skip it
        if (o.lastFollowUp) {
            const lastContactDate = parseDate(o.lastFollowUp);
            const daysSinceContact = differenceInDays(now, lastContactDate);
            if (daysSinceContact < daysThreshold) return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Sort by oldest first (highest priority)
        const dateA = parseDate(a.fechaIngreso).getTime();
        const dateB = parseDate(b.fechaIngreso).getTime();
        return dateA - dateB;
      });
  }, [orders, daysThreshold]);

  const handleCopyPhone = (phone: string, name: string) => {
    // Sanitization logic matching your main dashboard
    let clean = phone.replace(/\D/g, '');
    if (clean.startsWith('507') && clean.length > 7) {
      clean = clean.replace(/^507/, '');
    }
    navigator.clipboard.writeText(clean);
    toast({ 
        title: "Copied!", 
        description: `${name}'s number (${clean}) copied to clipboard.` 
    });
  };

  const handleMarkContacted = async (orderId: string, name: string) => {
    if (!firestore) return;
    
    setProcessingIds(prev => new Set(prev).add(orderId));
    
    try {
        const docRef = doc(firestore, 'orders', orderId);
        await updateDocumentNonBlocking(docRef, {
            lastFollowUp: new Date()
        });
        
        toast({
            title: "Follow-up Recorded",
            description: `Marked ${name} as contacted today.`,
            variant: "default", 
            className: "bg-green-50 border-green-200 text-green-800"
        });
    } catch (error) {
        toast({
            title: "Error",
            description: "Could not update follow-up status.",
            variant: "destructive"
        });
    } finally {
        setProcessingIds(prev => {
            const next = new Set(prev);
            next.delete(orderId);
            return next;
        });
    }
  };

  if (isLoading) {
    return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
        </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold tracking-tight">Quote Follow-Up</h2>
            <p className="text-muted-foreground text-sm">
                Clients waiting for a response or nudge.
            </p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-1 rounded-lg border shadow-sm">
            <span className="text-xs font-medium px-2 text-slate-500">Older than:</span>
            <Tabs value={daysThreshold.toString()} onValueChange={(v) => setDaysThreshold(Number(v))}>
                <TabsList className="h-8">
                    <TabsTrigger value="5" className="text-xs">5 Days</TabsTrigger>
                    <TabsTrigger value="10" className="text-xs">10 Days</TabsTrigger>
                    <TabsTrigger value="15" className="text-xs">15 Days</TabsTrigger>
                </TabsList>
            </Tabs>
        </div>
      </div>

      <Separator />

      {/* Main List */}
      <div className="grid grid-cols-1 gap-4">
        {actionableQuotes.length === 0 ? (
            <div className="text-center py-20 bg-slate-50 rounded-xl border border-dashed">
                <div className="bg-white p-3 rounded-full w-fit mx-auto mb-4 shadow-sm">
                    <Check className="h-6 w-6 text-green-500" />
                </div>
                <h3 className="text-lg font-medium text-slate-900">All caught up!</h3>
                <p className="text-slate-500 max-w-sm mx-auto mt-1">
                    No quotes older than {daysThreshold} days require follow-up right now.
                </p>
            </div>
        ) : (
            actionableQuotes.map((quote) => {
                const createdDate = parseDate(quote.fechaIngreso);
                const isProcessing = processingIds.has(quote.id);
                
                return (
                    <Card key={quote.id} className={cn("transition-all hover:shadow-md border-l-4 border-l-transparent hover:border-l-indigo-500", isProcessing && "opacity-50 pointer-events-none")}>
                        <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            
                            {/* Client Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-semibold text-lg truncate">{quote.name}</h3>
                                    <Badge variant="outline" className="font-normal text-slate-500 bg-slate-50">
                                        <Clock className="w-3 h-3 mr-1" />
                                        {formatDistanceToNow(createdDate)} ago
                                    </Badge>
                                </div>
                                <div className="text-sm text-slate-500 truncate mb-2">
                                    {quote.description || "No description provided"}
                                </div>
                                
                                {/* Contact Bar */}
                                <div className="flex items-center gap-4 text-sm">
                                    <button 
                                        onClick={() => handleCopyPhone(quote.celular, quote.name)}
                                        className="flex items-center gap-1.5 text-slate-600 hover:text-indigo-600 font-medium transition-colors group"
                                        title="Copy Phone Number"
                                    >
                                        <div className="p-1.5 rounded-full bg-slate-100 group-hover:bg-indigo-50 text-slate-500 group-hover:text-indigo-600">
                                            <Phone className="w-3.5 h-3.5" />
                                        </div>
                                        {quote.celular}
                                        <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                </div>
                            </div>

                            {/* Action Area */}
                            <div className="flex items-center gap-3 self-end md:self-center">
                                <div className="text-right hidden md:block mr-4">
                                    <div className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-0.5">Created</div>
                                    <div className="text-sm font-medium text-slate-700">
                                        {createdDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </div>
                                </div>
                                
                                <Button 
                                    onClick={() => handleMarkContacted(quote.id, quote.name)}
                                    size="lg" 
                                    className="gap-2 bg-slate-900 hover:bg-emerald-600 transition-colors shadow-sm"
                                    disabled={isProcessing}
                                >
                                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    Mark Contacted
                                </Button>
                            </div>

                        </CardContent>
                    </Card>
                );
            })
        )}
      </div>
    </div>
  );
}
