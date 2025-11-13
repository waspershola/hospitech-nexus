import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePlatformFeeConfig } from '@/hooks/usePlatformFeeConfig';
import { useDateRangeFilter } from '@/hooks/useDateRangeFilter';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { WaiveFeeDialog } from './WaiveFeeDialog';
import { Loader2, Receipt, Filter, CheckCircle, XCircle, Clock, DollarSign, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface TenantDetailFeeLedgerProps {
  tenantId: string;
  tenantName: string;
}

export default function TenantDetailFeeLedger({ tenantId, tenantName }: TenantDetailFeeLedgerProps) {
  const dateFilter = useDateRangeFilter('last30');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [waiveDialogOpen, setWaiveDialogOpen] = useState(false);

  const { ledger, isLoading, summary } = usePlatformFeeConfig(tenantId, {
    startDate: dateFilter.startDate,
    endDate: dateFilter.endDate,
  });

  // Filter ledger
  const filteredLedger = (ledger || []).filter(entry => {
    const matchesStatus = statusFilter === 'all' || entry.status === statusFilter;
    const matchesType = typeFilter === 'all' || entry.reference_type === typeFilter;
    return matchesStatus && matchesType;
  });

  const selectedFees = filteredLedger
    .filter(entry => selectedIds.includes(entry.id))
    .map(entry => ({
      id: entry.id,
      tenant_id: entry.tenant_id,
      tenant_name: tenantName,
      fee_amount: entry.fee_amount,
      reference_type: entry.reference_type,
      reference_id: entry.reference_id,
      status: entry.status,
    }));

  const waivabledCount = filteredLedger.filter(entry => 
    ['pending', 'billed'].includes(entry.status)
  ).length;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const waivabledIds = filteredLedger
        .filter(entry => ['pending', 'billed'].includes(entry.status))
        .map(entry => entry.id);
      setSelectedIds(waivabledIds);
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggle = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: any; icon: any; label: string }> = {
      pending: { variant: 'secondary', icon: Clock, label: 'Pending' },
      billed: { variant: 'default', icon: Receipt, label: 'Billed' },
      settled: { variant: 'default', icon: CheckCircle, label: 'Settled' },
      failed: { variant: 'destructive', icon: XCircle, label: 'Failed' },
      waived: { variant: 'outline', icon: AlertCircle, label: 'Waived' },
    };
    const { variant, icon: Icon, label } = config[status] || config.pending;
    return (
      <Badge variant={variant}>
        <Icon className="h-3 w-3 mr-1" />
        {label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Fees</CardDescription>
              <CardTitle className="text-2xl">
                ₦{summary?.total_fees.toFixed(2) || '0.00'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {filteredLedger.length} transaction{filteredLedger.length !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Unsettled Fees</CardDescription>
              <CardTitle className="text-2xl text-orange-600">
                ₦{summary?.outstanding_amount.toFixed(2) || '0.00'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Pending + Billed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Settled Fees</CardDescription>
              <CardTitle className="text-2xl text-green-600">
                ₦{summary?.settled_amount.toFixed(2) || '0.00'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Successfully paid
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Failed Payments</CardDescription>
              <CardTitle className="text-2xl text-red-600">
                {filteredLedger.filter(e => e.status === 'failed').length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Requires attention
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Fee Ledger Filters
                  </CardTitle>
                  <CardDescription>Filter by date range, status, and type</CardDescription>
                </div>
                {selectedIds.length > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setWaiveDialogOpen(true)}
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Waive Selected ({selectedIds.length})
                  </Button>
                )}
              </div>

              <DateRangePicker
                startDate={dateFilter.startDate}
                endDate={dateFilter.endDate}
                onStartDateChange={dateFilter.setStartDate}
                onEndDateChange={dateFilter.setEndDate}
                onPresetSelect={dateFilter.applyPreset}
                onClear={dateFilter.reset}
              />

              <div className="flex gap-4">
                <div className="flex-1">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="billed">Billed</SelectItem>
                      <SelectItem value="settled">Settled</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="waived">Waived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1">
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="booking">Booking</SelectItem>
                      <SelectItem value="qr_payment">QR Payment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Ledger Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Detailed Fee Ledger
            </CardTitle>
            <CardDescription>
              {filteredLedger.length} entries • {waivabledCount} waivable
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredLedger.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No fee entries found for the selected filters
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedIds.length === waivabledCount && waivabledCount > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Base Amount</TableHead>
                    <TableHead>Fee Amount</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Cycle</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLedger.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(entry.id)}
                          onCheckedChange={() => handleToggle(entry.id)}
                          disabled={!['pending', 'billed'].includes(entry.status)}
                        />
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(entry.created_at), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {entry.reference_type === 'booking' ? 'Booking' : 'QR Payment'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {entry.reference_id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>₦{Number(entry.base_amount).toFixed(2)}</TableCell>
                      <TableCell className="font-semibold">
                        ₦{Number(entry.fee_amount).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {entry.fee_type === 'percentage'
                          ? `${entry.rate}%`
                          : `₦${entry.rate}`}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {entry.billing_cycle}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(entry.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <WaiveFeeDialog
        open={waiveDialogOpen}
        onOpenChange={setWaiveDialogOpen}
        selectedFees={selectedFees}
      />
    </>
  );
}
