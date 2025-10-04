import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface FilterOptions {
  sortBy: 'newest' | 'oldest' | 'likes_high';
}

interface ProfileFiltersProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  totalCount: number;
}

export function ProfileFilters({ 
  filters, 
  onFiltersChange, 
  totalCount 
}: ProfileFiltersProps) {
  const handleSortChange = (value: string) => {
    onFiltersChange({
      ...filters,
      sortBy: value as FilterOptions['sortBy']
    });
  };

  const sortOptions = [
    { value: 'newest', label: 'Новые сначала' },
    { value: 'oldest', label: 'Старые сначала' },
    { value: 'likes_high', label: 'Больше лайков' }
  ];

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Label htmlFor="sortBy" className="font-medium">Сортировка:</Label>
            <Select
              value={filters.sortBy}
              onValueChange={handleSortChange}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <span className="text-sm text-muted-foreground">
            Найдено: {totalCount}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
