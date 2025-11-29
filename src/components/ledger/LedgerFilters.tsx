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
import { usePaymentMethods } from '@/hooks/usePaymentMethods';
import { useFinanceProviders } from '@/hooks/useFinanceProviders';
import { useFinanceLocations } from '@/hooks/useFinanceLocations';
import { useStaffManagement } from '@/hooks/useStaffManagement';

interface LedgerFiltersProps {
  filters: LedgerFiltersType;
  onFiltersChange: (filters: LedgerFiltersType) => void;
}

export function LedgerFilters({ filters, onFiltersChange }: LedgerFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Fetch dynamic data from tenant configuration
  const { paymentMethods, isLoading: loadingMethods } = usePaymentMethods();
  const { providers, isLoading: loadingProviders } = useFinanceProviders();
  const { locations, isLoading: loadingLocations } = useFinanceLocations();
  const { staff, isLoading: loadingStaff } = useStaffManagement();

  const handleReset = () => {
    onFiltersChange({
      dateFrom: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().slice(0, 16),
      dateTo: new Date().toISOString().slice(0, 16),
    });
  };

  // Static arrays for non-configurable filters
  const transactionTypes = ['credit', 'debit', 'refund', 'reversal', 'wallet_topup', 'wallet_deduction', 'pos', 'transfer', 'cash'];
  const departments = ['frontdesk', 'restaurant', 'bar', 'housekeeping', 'spa', 'laundry', 'maintenance'];
  const statuses = ['completed', 'pending', 'refunded', 'failed'];
  const reconciliationStatuses = ['reconciled', 'pending', 'disputed'];
  const shifts = ['morning', 'afternoon', 'evening', 'night'];
  const sourceTypes = ['folio', 'qr-request', 'checkin-guest', 'payment', 'group_booking', 'org_booking', 'wallet', 'pos', 'cash_drawer'];
  const walletTypes = ['guest', 'department', 'organization'];

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
          <Label htmlFor="dateFrom">From Date & Time</Label>
          <Input
            id="dateFrom"
            type="datetime-local"
            value={filters.dateFrom || ''}
            onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dateTo">To Date & Time</Label>
          <Input
            id="dateTo"
            type="datetime-local"
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
            value={filters.shift || 'all'}
            onValueChange={(value) => onFiltersChange({ ...filters, shift: value === 'all' ? undefined : value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Shifts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Shifts</SelectItem>
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
          {/* Dynamic Dropdowns Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Payment Method */}
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select
                value={filters.paymentMethodId || 'all'}
                onValueChange={(value) => onFiltersChange({ ...filters, paymentMethodId: value === 'all' ? undefined : value })}
                disabled={loadingMethods}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  {(paymentMethods || []).map((method) => (
                    <SelectItem key={method.id} value={method.id}>
                      {method.method_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Payment Provider */}
            <div className="space-y-2">
              <Label>Payment Provider</Label>
              <Select
                value={filters.paymentProviderId || 'all'}
                onValueChange={(value) => onFiltersChange({ ...filters, paymentProviderId: value === 'all' ? undefined : value })}
                disabled={loadingProviders}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Providers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Providers</SelectItem>
                  {(providers || []).map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Payment Location */}
            <div className="space-y-2">
              <Label>Payment Location</Label>
              <Select
                value={filters.paymentLocationId || 'all'}
                onValueChange={(value) => onFiltersChange({ ...filters, paymentLocationId: value === 'all' ? undefined : value })}
                disabled={loadingLocations}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {(locations || []).map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dynamic Dropdowns Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Staff Member */}
            <div className="space-y-2">
              <Label>Staff Member</Label>
              <Select
                value={filters.staffId || 'all'}
                onValueChange={(value) => onFiltersChange({ ...filters, staffId: value === 'all' ? undefined : value })}
                disabled={loadingStaff}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Staff</SelectItem>
                  {(staff || []).map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Room Category */}
            <div className="space-y-2">
              <Label htmlFor="roomCategory">Room Category</Label>
              <Input
                id="roomCategory"
                placeholder="e.g. Deluxe, Suite..."
                value={filters.roomCategory || ''}
                onChange={(e) => onFiltersChange({ ...filters, roomCategory: e.target.value })}
              />
            </div>
          </div>

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

          {/* Source Types */}
          <div className="space-y-2">
            <Label>Source Type</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {sourceTypes.map((type) => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={`source-${type}`}
                    checked={(filters.sourceType || []).includes(type)}
                    onCheckedChange={() => toggleArrayFilter('sourceType', type)}
                  />
                  <Label htmlFor={`source-${type}`} className="cursor-pointer text-sm font-normal">
                    {type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Wallet Types */}
          <div className="space-y-2">
            <Label>Wallet Type</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {walletTypes.map((type) => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={`wallet-${type}`}
                    checked={(filters.walletType || []).includes(type)}
                    onCheckedChange={() => toggleArrayFilter('walletType', type)}
                  />
                  <Label htmlFor={`wallet-${type}`} className="cursor-pointer text-sm font-normal">
                    {type.charAt(0).toUpperCase() + type.slice(1)}
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
