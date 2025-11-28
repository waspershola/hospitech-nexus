import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Filter, X } from 'lucide-react';
import type { LedgerFilters as LedgerFiltersType } from '@/types/ledger';

interface LedgerFiltersProps {
  filters: LedgerFiltersType;
  onFiltersChange: (filters: LedgerFiltersType) => void;
}

export function LedgerFilters({ filters, onFiltersChange }: LedgerFiltersProps) {
  const handleReset = () => {
    onFiltersChange({
      dateFrom: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
      dateTo: new Date().toISOString().split('T')[0],
    });
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-medium">Filters</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={handleReset}>
          <X className="h-4 w-4 mr-2" />
          Reset
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dateFrom">From Date</Label>
          <Input
            id="dateFrom"
            type="date"
            value={filters.dateFrom || ''}
            onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dateTo">To Date</Label>
          <Input
            id="dateTo"
            type="date"
            value={filters.dateTo || ''}
            onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="search">Search</Label>
          <Input
            id="search"
            placeholder="Transaction ref or guest..."
            value={filters.search || ''}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
