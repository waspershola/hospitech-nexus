import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Filter } from 'lucide-react';

interface FilterBarProps {
  statusFilter: string | null;
  categoryFilter: string | null;
  floorFilter: number | null;
  organizationFilter: string | null;
  categories: Array<{ id: string; name: string }>;
  floors: number[];
  organizations: Array<{ id: string; name: string }>;
  onStatusChange: (value: string | null) => void;
  onCategoryChange: (value: string | null) => void;
  onFloorChange: (value: number | null) => void;
  onOrganizationChange: (value: string | null) => void;
  onClearAll: () => void;
}

export function FilterBar({
  statusFilter,
  categoryFilter,
  floorFilter,
  organizationFilter,
  categories,
  floors,
  organizations,
  onStatusChange,
  onCategoryChange,
  onFloorChange,
  onOrganizationChange,
  onClearAll,
}: FilterBarProps) {
  const hasFilters = statusFilter || categoryFilter || floorFilter !== null || organizationFilter;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <Filter className="w-4 h-4 text-muted-foreground" />
        
        <Select value={statusFilter || 'all'} onValueChange={(v) => onStatusChange(v === 'all' ? null : v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="occupied">Occupied</SelectItem>
            <SelectItem value="reserved">Reserved</SelectItem>
            <SelectItem value="cleaning">Cleaning</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
            <SelectItem value="overstay">Overstay</SelectItem>
          </SelectContent>
        </Select>

        <Select value={categoryFilter || 'all'} onValueChange={(v) => onCategoryChange(v === 'all' ? null : v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={floorFilter !== null ? String(floorFilter) : 'all'}
          onValueChange={(v) => onFloorChange(v === 'all' ? null : parseInt(v))}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Floor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Floors</SelectItem>
            {floors.map((floor) => (
              <SelectItem key={floor} value={String(floor)}>
                Floor {floor}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={organizationFilter || 'all'} onValueChange={(v) => onOrganizationChange(v === 'all' ? null : v)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Organization" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Organizations</SelectItem>
            {organizations.map((org) => (
              <SelectItem key={org.id} value={org.id}>
                {org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={onClearAll}>
            <X className="w-4 h-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      {hasFilters && (
        <div className="flex flex-wrap gap-2">
          {statusFilter && (
            <Badge variant="secondary" className="gap-1">
              Status: {statusFilter}
              <X
                className="w-3 h-3 cursor-pointer"
                onClick={() => onStatusChange(null)}
              />
            </Badge>
          )}
          {categoryFilter && (
            <Badge variant="secondary" className="gap-1">
              Category: {categories.find((c) => c.id === categoryFilter)?.name}
              <X
                className="w-3 h-3 cursor-pointer"
                onClick={() => onCategoryChange(null)}
              />
            </Badge>
          )}
          {floorFilter !== null && (
            <Badge variant="secondary" className="gap-1">
              Floor: {floorFilter}
              <X
                className="w-3 h-3 cursor-pointer"
                onClick={() => onFloorChange(null)}
              />
            </Badge>
          )}
          {organizationFilter && (
            <Badge variant="secondary" className="gap-1">
              Organization: {organizations.find((o) => o.id === organizationFilter)?.name}
              <X
                className="w-3 h-3 cursor-pointer"
                onClick={() => onOrganizationChange(null)}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
