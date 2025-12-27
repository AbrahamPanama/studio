'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Upload, AlertTriangle, FileJson } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';
import type { Order } from '@/lib/types';

export default function AdminImportPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/json') {
        setError('Invalid file type. Please upload a .json file.');
        setFile(null);
      } else {
        setError(null);
        setFile(selectedFile);
      }
    }
  };

  const handleImport = async () => {
    if (!file || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No file selected or database not ready.',
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') {
          throw new Error('Failed to read file content.');
        }
        
        const orders: Order[] = JSON.parse(text);

        if (!Array.isArray(orders)) {
          throw new Error('JSON file must contain an array of order objects.');
        }

        const batch = writeBatch(firestore);
        let importedCount = 0;

        orders.forEach((order) => {
          if (!order.id) {
            console.warn('Skipping order without an ID:', order);
            return;
          }

          const docRef = doc(firestore, 'orders', order.id);
          
          // Create a mutable copy and transform date strings to Date objects
          const dataToWrite: { [key: string]: any } = { ...order };
          const dateFields: (keyof Order)[] = ['entrega', 'entregaLimite', 'fechaIngreso'];

          dateFields.forEach(field => {
            if (dataToWrite[field] && typeof dataToWrite[field] === 'string') {
              const parsedDate = new Date(dataToWrite[field]);
              if (!isNaN(parsedDate.getTime())) {
                dataToWrite[field] = parsedDate;
              } else {
                 console.warn(`Invalid date string for field '${field}' in order ${order.id}:`, dataToWrite[field]);
                 // Keep original or set to null if it's invalid
                 delete dataToWrite[field];
              }
            }
          });

          batch.set(docRef, dataToWrite);
          importedCount++;
        });

        await batch.commit();

        toast({
          title: 'Import Successful!',
          description: `${importedCount} orders have been imported into the live database.`,
        });

      } catch (err: any) {
        setError(`Import failed: ${err.message}. Check console for details.`);
        console.error(err);
        toast({
          variant: 'destructive',
          title: 'Import Failed',
          description: 'The JSON file might be malformed or the data is incorrect.',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    reader.onerror = () => {
        setError('Failed to read the file.');
        setIsLoading(false);
    }

    reader.readAsText(file);
  };

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Import Orders from JSON</CardTitle>
          <CardDescription>
            Migrate order data from a JSON backup file directly into the live Firestore database.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-800">
            <AlertTriangle className="h-4 w-4 !text-amber-600" />
            <AlertTitle className="font-bold">Danger Zone</AlertTitle>
            <AlertDescription>
              This action writes directly to the production database. Make sure your JSON file is correctly formatted to avoid corrupting data.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <label htmlFor="json-upload" className="font-medium text-sm">Upload JSON File</label>
            <div className="flex items-center gap-4">
                 <Input
                    id="json-upload"
                    type="file"
                    accept=".json"
                    onChange={handleFileChange}
                    disabled={isLoading}
                    className="flex-grow file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
            </div>
            {file && <p className="text-sm text-muted-foreground flex items-center gap-2"><FileJson className="h-4 w-4" /> Selected: {file.name}</p>}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button
            onClick={handleImport}
            disabled={!file || isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Import Orders
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
