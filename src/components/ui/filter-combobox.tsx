'use client';

import * as React from 'react';
import { Check, Search, SlidersHorizontal } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export type FilterOption = {
  value: string;
  label: string;
};

type FilterComboboxProps = {
  options: FilterOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  emptyMessage?: string;
  groupLabel?: string;
  className?: string;
  disabled?: boolean;
  icon?: React.ReactElement<{ className?: string }>;
};

export function FilterCombobox({
  options,
  selected = [],
  onChange,
  placeholder = 'Buscar...',
  emptyMessage = 'No se encontraron opciones.',
  groupLabel = 'Opciones',
  className,
  disabled = false,
  icon,
}: FilterComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const selectedCount = selected.length;

  // Filter options based on search
  const filteredOptions = React.useMemo(() => {
    if (!search) return options;
    const searchLower = search.toLowerCase();
    return options.filter((option) =>
      option.label.toLowerCase().includes(searchLower)
    );
  }, [options, search]);

  // Handle selection changes
  const handleSelect = React.useCallback(
    (value: string) => {
      const newSelected = [...selected];
      const selectedIndex = newSelected.indexOf(value);

      if (selectedIndex >= 0) {
        newSelected.splice(selectedIndex, 1);
      } else {
        newSelected.push(value);
      }

      onChange(newSelected);
    },
    [onChange, selected]
  );

  // Clear all selections
  const handleClear = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange([]);
    },
    [onChange]
  );

  // Reset search when popover closes
  React.useEffect(() => {
    if (!open) {
      setSearch('');
    }
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'relative inline-flex h-9 items-center gap-2 rounded-md border bg-transparent px-3 py-2 text-sm text-muted-foreground transition-colors cursor-pointer hover:bg-accent hover:text-accent-foreground',
            {
              'border-primary bg-primary/10 text-primary hover:bg-primary/20':
                selectedCount > 0,
            },
            className
          )}
        >
          {icon ? (
            React.cloneElement(icon, {
              className: cn('h-4 w-4', {
                'text-primary': selectedCount > 0,
              }),
            })
          ) : (
            <SlidersHorizontal
              className={cn('h-4 w-4', {
                'text-primary': selectedCount > 0,
              })}
            />
          )}
          <span className={selectedCount > 0 ? 'font-medium' : ''}>
            {groupLabel}
          </span>
          {selectedCount > 0 && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
              {selectedCount}
            </Badge>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        {/* Search input */}
        <div className="flex items-center gap-2 border-b p-2">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            placeholder={placeholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          {selectedCount > 0 && (
            <button
              onClick={handleClear}
              className="text-xs text-muted-foreground hover:text-foreground whitespace-nowrap"
            >
              Limpiar
            </button>
          )}
        </div>

        {/* Options list */}
        <div className="p-1" style={{ maxHeight: '256px', overflowY: 'auto' }}>
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </div>
          ) : (
            filteredOptions.map((option) => {
              const isSelected = selected.includes(option.value);

              return (
                <div
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    'relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
                    { 'bg-accent/50': isSelected }
                  )}
                >
                  <div
                    className={cn(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-muted-foreground/50'
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3 shrink-0" />}
                  </div>
                  <span>{option.label}</span>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
