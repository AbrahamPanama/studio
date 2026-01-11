
'use client';

import * as React from 'react';
import {
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  writeBatch,
} from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import type { Order } from '@/lib/types';
import {
  getOrderComplexity,
  type ComplexityLevel,
} from '@/lib/workload-utils';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Wand2,
  User,
  Check,
  ChevronDown,
  CircleDot,
  Radio,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const complexityConfig: Record<
  ComplexityLevel,
  { color: string; label: string }
> = {
  LOW: { color: 'bg-blue-500', label: 'Low' },
  MEDIUM: { color: 'bg-amber-500', label: 'Medium' },
  HIGH: { color: 'bg-red-500', label: 'High' },
};

const complexityTags = [
  'complexity:low',
  'complexity:medium',
  'complexity:high',
];

export function ComplexityTagSelector({ order }: { order: Order }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();
  const { level, isManual } = getOrderComplexity(order);

  const handleComplexityChange = (newLevel: ComplexityLevel | 'AUTO') => {
    if (!firestore) return;

    startTransition(async () => {
      try {
        const docRef = doc(firestore, 'orders', order.id);
        const batch = writeBatch(firestore);

        // 1. Atomically remove all existing complexity tags
        batch.update(docRef, {
          tags: arrayRemove(...complexityTags),
        });

        // 2. Add the new tag if a specific level is chosen
        if (newLevel !== 'AUTO') {
          const newTag = `complexity:${newLevel.toLowerCase()}`;
          batch.update(docRef, {
            tags: arrayUnion(newTag),
          });
        }

        await batch.commit();

        toast({
          title: 'Complexity Updated',
          description: `Order ${order.orderNumber} is now set to ${
            newLevel === 'AUTO' ? 'Auto' : newLevel
          }.`,
        });
      } catch (error) {
        console.error('Failed to update complexity:', error);
        toast({
          variant: 'destructive',
          title: 'Update Failed',
          description: 'Could not update the order complexity.',
        });
      }
    });
  };

  const TriggerBadge = () => {
    if (isManual) {
      return (
        <Badge
          className={cn(
            'flex items-center gap-1.5 text-white',
            complexityConfig[level].color
          )}
        >
          <User className="h-3 w-3" />
          <span>{complexityConfig[level].label}</span>
          <ChevronDown className="h-3 w-3" />
        </Badge>
      );
    }
    
    // MODIFIED: Added color coding to the Auto badge
    return (
      <Badge
        className={cn(
          'flex items-center gap-1.5 text-white border-2 border-dashed border-white/40', // Added border styling
          complexityConfig[level].color // Apply the background color
        )}
      >
        <Wand2 className="h-3 w-3" />
        <span>Auto ({complexityConfig[level].label})</span>
        <ChevronDown className="h-3 w-3" />
      </Badge>
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-auto p-0"
          disabled={isPending}
        >
          <TriggerBadge />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Set Complexity</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => handleComplexityChange('AUTO')}>
          <Wand2 className="mr-2 h-4 w-4" />
          <span>Auto (Calculated)</span>
          {!isManual && <Check className="ml-auto h-4 w-4" />}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => handleComplexityChange('LOW')}>
          <CircleDot className="mr-2 h-4 w-4 text-blue-500" />
          <span>Low</span>
          {isManual && level === 'LOW' && (
            <Check className="ml-auto h-4 w-4" />
          )}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => handleComplexityChange('MEDIUM')}>
          <CircleDot className="mr-2 h-4 w-4 text-amber-500" />
          <span>Medium</span>
          {isManual && level === 'MEDIUM' && (
            <Check className="ml-auto h-4 w-4" />
          )}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => handleComplexityChange('HIGH')}>
          <CircleDot className="mr-2 h-4 w-4 text-red-500" />
          <span>High</span>
          {isManual && level === 'HIGH' && (
            <Check className="ml-auto h-4 w-4" />
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
