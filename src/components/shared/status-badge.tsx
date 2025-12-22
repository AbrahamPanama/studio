
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Order } from '@/lib/types';

type Status = Order['estado'];

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const commonClass = "capitalize whitespace-nowrap text-white border-none";

  switch (status) {
    case 'Urgent':
      return <Badge className={cn(commonClass, "bg-red-500 hover:bg-red-600", className)}>Urgent</Badge>;
    case 'Done':
      return <Badge className={cn(commonClass, "bg-green-500 hover:bg-green-600", className)}>Done</Badge>;
    case 'New':
      return <Badge className={cn(commonClass, "bg-blue-500 hover:bg-blue-600", className)}>New</Badge>;
    case 'On Hand/Working':
      return <Badge className={cn(commonClass, "bg-purple-500 hover:bg-purple-600", className)}>On Hand/Working</Badge>;
    case 'Packaging':
      return <Badge className={cn(commonClass, "bg-yellow-500 hover:bg-yellow-600", className)}>Packaging</Badge>;
    case 'Cotización':
      return <Badge className={cn(commonClass, "bg-gray-500 hover:bg-gray-600", className)}>Cotización</Badge>;
    case 'Pending':
      return <Badge className={cn(commonClass, "bg-orange-500 hover:bg-orange-600", className)}>{status}</Badge>;
    default:
      return <Badge className={cn(commonClass, "bg-gray-700 hover:bg-gray-800", className)}>{status}</Badge>;
  }
}
