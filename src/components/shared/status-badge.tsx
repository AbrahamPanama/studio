
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Order } from '@/lib/types';

type Status = Order['estado'];

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const commonClass = "capitalize whitespace-nowrap border-transparent";
  
  // Translucent Pills Style
  switch (status) {
    case 'Urgent':
      return <Badge className={cn(commonClass, "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300", className)}>Urgent</Badge>;
    case 'Done':
      return <Badge className={cn(commonClass, "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300", className)}>Done</Badge>;
    case 'New':
      return <Badge className={cn(commonClass, "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300", className)}>New</Badge>;
    case 'On Hand/Working':
      return <Badge className={cn(commonClass, "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300", className)}>On Hand/Working</Badge>;
    case 'Packaging':
      return <Badge className={cn(commonClass, "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300", className)}>Packaging</Badge>;
    case 'Cotización':
      return <Badge className={cn(commonClass, "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300", className)}>Cotización</Badge>;
    case 'Pending':
      return <Badge className={cn(commonClass, "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300", className)}>{status}</Badge>;
    default:
      return <Badge className={cn(commonClass, "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300", className)}>{status}</Badge>;
  }
}
