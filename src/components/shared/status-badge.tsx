
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Order } from '@/lib/types';

type Status = Order['estado'];

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const commonClass = "capitalize whitespace-nowrap text-base bg-white hover:bg-gray-50 border";

  switch (status) {
    case 'Urgent':
      return <Badge variant="outline" className={cn(commonClass, "text-red-500 border-red-500", className)}>Urgent</Badge>;
    case 'Done':
      return <Badge variant="outline" className={cn(commonClass, "text-green-500 border-green-500", className)}>Done</Badge>;
    case 'New':
      return <Badge variant="outline" className={cn(commonClass, "text-blue-500 border-blue-500", className)}>New</Badge>;
    case 'On Hand/Working':
      return <Badge variant="outline" className={cn(commonClass, "text-purple-500 border-purple-500", className)}>On Hand/Working</Badge>;
    case 'Packaging':
      return <Badge variant="outline" className={cn(commonClass, "text-yellow-500 border-yellow-500", className)}>Packaging</Badge>;
    case 'Cotización':
      return <Badge variant="outline" className={cn(commonClass, "text-gray-500 border-gray-500", className)}>Cotización</Badge>;
    case 'Pending':
      return <Badge variant="outline" className={cn(commonClass, "text-orange-500 border-orange-500", className)}>{status}</Badge>;
    default:
      return <Badge variant="outline" className={cn(commonClass, "text-gray-700 border-gray-400", className)}>{status}</Badge>;
  }
}
