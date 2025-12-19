import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Order } from '@/lib/types';

type Status = Order['estado'];

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const commonClass = "capitalize whitespace-nowrap";

  switch (status) {
    case 'Urgent':
      return <Badge variant="destructive" className={cn(commonClass, className)}>Urgent</Badge>;
    case 'Done':
      return <Badge className={cn("border-transparent bg-[hsl(var(--chart-2))] text-primary-foreground hover:bg-[hsl(var(--chart-2))]/80", commonClass, className)}>Done</Badge>;
    case 'New':
      return <Badge variant="default" className={cn(commonClass, className)}>New</Badge>;
    case 'On Hand/Working':
      return <Badge className={cn("border-transparent bg-[hsl(var(--chart-4))] text-foreground hover:bg-[hsl(var(--chart-4))]/80", commonClass, className)}>On Hand/Working</Badge>;
    case 'Packaging':
      return <Badge className={cn("border-transparent bg-accent text-accent-foreground hover:bg-accent/80", commonClass, className)}>Packaging</Badge>;
    case 'Cotización':
      return <Badge variant="secondary" className={cn(commonClass, className)}>Cotización</Badge>;
    case 'Pending':
    default:
      return <Badge variant="outline" className={cn(commonClass, className)}>{status}</Badge>;
  }
}
