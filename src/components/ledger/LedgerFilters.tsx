import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { LedgerFilters as LedgerFiltersType } from '@/types/ledger';

interface LedgerFiltersProps {
  filters: LedgerFiltersType;
  onFiltersChange: (filters: LedgerFiltersType) => void;
}

export function LedgerFilters({ filters, onFiltersChange }: LedgerFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleReset = () => {
    onFiltersChange({
      dateFrom: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
      dateTo: new Date().toISOString().split('T')[0],
    });
  };

  const transactionTypes = ['credit', 'debit', 'refund', 'reversal', 'wallet_topup', 'wallet_deduction', 'pos', 'transfer', 'cash'];
  const paymentMethods = ['cash', 'card', 'pos', 'transfer', 'mobile_money'];
  const departments = ['frontdesk', 'restaurant', 'bar', 'housekeeping', 'spa', 'laundry', 'maintenance'];
  const statuses = ['completed', 'pending', 'refunded', 'failed'];
  const reconciliationStatuses = ['reconciled', 'pending', 'disputed'];
  const shifts = ['morning', 'afternoon', 'evening', 'night'];

  const toggleArrayFilter = (key: keyof LedgerFiltersType, value: string) => {
    const current = (filters[key] as string[]) || [];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onFiltersChange({ ...filters, [key]: updated });
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

      {/* Basic Filters */}
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

        <div className="space-y-2">
          <Label>Shift</Label>
          <Select
            value={filters.shift || ''}
            onValueChange={(value) => onFiltersChange({ ...filters, shift: value || undefined })}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Shifts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Shifts</SelectItem>
              {shifts.map((shift) => (
                <SelectItem key={shift} value={shift}>
                  {shift.charAt(0).toUpperCase() + shift.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Advanced Filters */}
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="w-full">
            {showAdvanced ? (
              <>
                <ChevronUp className="h-4 w-4 mr-2" />
                Hide Advanced Filters
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-2" />
                Show Advanced Filters
              </>
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-4">
          {/* Transaction Types */}
          <div className="space-y-2">
            <Label>Transaction Type</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {transactionTypes.map((type) => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={`type-${type}`}
                    checked={(filters.transactionType || []).includes(type)}
                    onCheckedChange={() => toggleArrayFilter('transactionType', type)}
                  />
                  <Label htmlFor={`type-${type}`} className="cursor-pointer text-sm font-normal">
                    {type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Methods */}
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {paymentMethods.map((method) => (
                <div key={method} className="flex items-center space-x-2">
                  <Checkbox
                    id={`method-${method}`}
                    checked={(filters.paymentMethod || []).includes(method)}
                    onCheckedChange={() => toggleArrayFilter('paymentMethod', method)}
                  />
                  <Label htmlFor={`method-${method}`} className="cursor-pointer text-sm font-normal">
                    {method.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Departments */}
          <div className="space-y-2">
            <Label>Department</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {departments.map((dept) => (
                <div key={dept} className="flex items-center space-x-2">
                  <Checkbox
                    id={`dept-${dept}`}
                    checked={(filters.department || []).includes(dept)}
                    onCheckedChange={() => toggleArrayFilter('department', dept)}
                  />
                  <Label htmlFor={`dept-${dept}`} className="cursor-pointer text-sm font-normal">
                    {dept.charAt(0).toUpperCase() + dept.slice(1)}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Status & Reconciliation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <div className="grid grid-cols-2 gap-3">
                {statuses.map((status) => (
                  <div key={status} className="flex items-center space-x-2">
                    <Checkbox
                      id={`status-${status}`}
                      checked={(filters.status || []).includes(status)}
                      onCheckedChange={() => toggleArrayFilter('status', status)}
                    />
                    <Label htmlFor={`status-${status}`} className="cursor-pointer text-sm font-normal">
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Reconciliation Status</Label>
              <div className="grid grid-cols-2 gap-3">
                {reconciliationStatuses.map((status) => (
                  <div key={status} className="flex items-center space-x-2">
                    <Checkbox
                      id={`recon-${status}`}
                      checked={(filters.reconciliationStatus || []).includes(status)}
                      onCheckedChange={() => toggleArrayFilter('reconciliationStatus', status)}
                    />
                    <Label htmlFor={`recon-${status}`} className="cursor-pointer text-sm font-normal">
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
