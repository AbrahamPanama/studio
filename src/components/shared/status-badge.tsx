
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Order } from '@/lib/types';

type Status = Order['estado'];

export function StatusBadge({ status, className, showText = true }: { status: Status; className?: string, showText?: boolean }) {
  const commonClass = "capitalize border-transparent";
  const iconOnlyClass = "w-6 h-6 p-0 flex items-center justify-center";
  
  const text = showText ? status : <span className="sr-only">{status}</span>;
  const badgeClasses = showText ? commonClass : cn(commonClass, iconOnlyClass);

  // Translucent Pills Style
  switch (status) {
    case 'Urgent':
      return <Badge className={cn(badgeClasses, "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300", className)}>{text}</Badge>;
    case 'Done':
      return <Badge className={cn(badgeClasses, "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300", className)}>{text}</Badge>;
    case 'New':
      return <Badge className={cn(badgeClasses, "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300", className)}>{text}</Badge>;
    case 'On Hand/Working':
      return <Badge className={cn(badgeClasses, "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300", className)}>{text}</Badge>;
    case 'Packaging':
      return <Badge className={cn(badgeClasses, "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300", className)}>{text}</Badge>;
    case 'Cotización':
      return <Badge className={cn(badgeClasses, "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300", className)}>{text}</Badge>;
    case 'Pending':
      return <Badge className={cn(badgeClasses, "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300", className)}>{text}</Badge>;
    default:
      return <Badge className={cn(badgeClasses, "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300", className)}>{text}</Badge>;
  }
}
