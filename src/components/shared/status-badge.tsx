import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Order } from '@/lib/types';

type Status = Order['estado'];

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const commonClass = "capitalize whitespace-nowrap text-base";

  switch (status) {
    case 'Urgent':
      return <Badge variant="destructive" className={cn(commonClass, className)}>Urgent</Badge>;
    case 'Done':
      return <Badge className={cn("border-transparent bg-green-500 text-primary-foreground hover:bg-green-500/80", commonClass, className)}>Done</Badge>;
    case 'New':
      return <Badge variant="default" className={cn(commonClass, className)}>New</Badge>;
    case 'On Hand/Working':
      return <Badge className={cn("border-transparent bg-blue-500 text-primary-foreground hover:bg-blue-500/80", commonClass, className)}>On Hand/Working</Badge>;
    case 'Packaging':
      return <Badge className={cn("border-transparent bg-yellow-500 text-primary-foreground hover:bg-yellow-500/80", commonClass, className)}>Packaging</Badge>;
    case 'Cotización':
      return <Badge variant="secondary" className={cn(commonClass, className)}>Cotización</Badge>;
    case 'Pending':
      return <Badge variant="outline" className={cn("border-orange-500 text-orange-500", commonClass, className)}>{status}</Badge>;
    default:
      return <Badge variant="outline" className={cn(commonClass, className)}>{status}</Badge>;
  }
}
