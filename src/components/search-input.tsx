'use client';

import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export function SearchInput({ placeholder }: { placeholder: string }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  // 1. Read State from URL
  const currentQuery = searchParams.get('query')?.toString();
  // Default to 'true' (ticked) if the param is missing
  const excludeCompleted = searchParams.get('excludeCompleted') !== 'false';

  // 2. Handle Text Search (Debounced)
  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams);
    if (term) {
      params.set('query', term);
    } else {
      params.delete('query');
    }
    replace(`${pathname}?${params.toString()}`);
  }, 300);

  // 3. Handle Checkbox Toggle
  const handleCheckbox = (checked: boolean) => {
    const params = new URLSearchParams(searchParams);
    params.set('excludeCompleted', checked.toString());
    replace(`${pathname}?${params.toString()}`);
  };

  // 4. Clear Search
  const clearSearch = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('query');
    replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Search Input */}
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
        <Input
          placeholder={placeholder}
          className="pl-9 pr-8 bg-white shadow-sm border-slate-200 focus-visible:ring-indigo-500"
          onChange={(e) => handleSearch(e.target.value)}
          defaultValue={currentQuery}
        />
        {currentQuery && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Exclude Completed Checkbox */}
      <div className="flex items-center space-x-2 px-1">
        <Checkbox 
          id="exclude-completed" 
          checked={excludeCompleted}
          onCheckedChange={handleCheckbox}
        />
        <Label 
          htmlFor="exclude-completed" 
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-600"
        >
          Exclude Completed
        </Label>
      </div>
    </div>
  );
}
