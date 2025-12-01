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
    <div className="space-y-2 flex-1">
      <div className="flex flex-wrap gap-1.5 items-center">
        <Filter className="w-3 h-3 text-muted-foreground shrink-0" />
        
        <div className="relative">
          <Select value={statusFilter || 'all'} onValueChange={(v) => onStatusChange(v === 'all' ? null : v)}>
            <SelectTrigger className="w-28 sm:w-32 h-8 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="occupied">Occupied</SelectItem>
              <SelectItem value="reserved">Reserved</SelectItem>
              <SelectItem value="no-show">No-Show</SelectItem>
              <SelectItem value="cleaning">Cleaning</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="overstay">Overstay</SelectItem>
              <SelectItem value="pending_payments">Pending Payments</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Select value={categoryFilter || 'all'} onValueChange={(v) => onCategoryChange(v === 'all' ? null : v)}>
          <SelectTrigger className="w-28 sm:w-32 h-8 text-xs">
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
          <SelectTrigger className="w-20 sm:w-24 h-8 text-xs">
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
          <SelectTrigger className="w-32 sm:w-40 h-8 text-xs">
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
          <Button variant="ghost" size="sm" onClick={onClearAll} className="h-8">
            <X className="w-2.5 h-2.5 mr-1" />
            <span className="text-[10px]">Clear</span>
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
