import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Receipt, DollarSign, AlertCircle, CreditCard, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { usePlatformFeeConfig } from '@/hooks/usePlatformFeeConfig';
import { useDateRangeFilter } from '@/hooks/useDateRangeFilter';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { TenantPaymentHistoryTab } from '@/components/finance/TenantPaymentHistoryTab';
import { format } from 'date-fns';

interface TenantDetailBillingProps {
  tenantId: string;
  tenantName: string;
}

export default function TenantDetailBilling({ tenantId, tenantName }: TenantDetailBillingProps) {
  const dateFilter = useDateRangeFilter('last30');
  
  const { data: invoices, isLoading: isLoadingInvoices } = useQuery({
    queryKey: ['tenant-invoices', tenantId, dateFilter.startDate?.toISOString(), dateFilter.endDate?.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from('platform_invoices')
        .select('*')
        .eq('tenant_id', tenantId);
      
      if (dateFilter.startDate) {
        query = query.gte('created_at', dateFilter.startDate.toISOString());
      }
      if (dateFilter.endDate) {
        query = query.lte('created_at', dateFilter.endDate.toISOString());
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const { summary: feeSummary, ledger, isLoading: isLoadingFees } = usePlatformFeeConfig(tenantId, {
    startDate: dateFilter.startDate,
    endDate: dateFilter.endDate,
  });

  const unsettledFees = (ledger || []).filter(entry => 
    ['pending', 'billed'].includes(entry.status)
  );

  const isLoading = isLoadingInvoices || isLoadingFees;

  const handleDownloadInvoice = (invoiceId: string) => {
    toast.info('Invoice download will be implemented soon');
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'destructive' | 'outline' | 'secondary'> = {
      paid: 'default',
      pending: 'secondary',
      overdue: 'destructive',
      cancelled: 'outline'
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate summary stats
  const totalBilled = invoices?.reduce((sum, inv) => sum + Number(inv.total_amount), 0) || 0;
  const totalSettled = feeSummary?.settled_amount || 0;
  const outstandingFees = feeSummary?.outstanding_amount || 0;
  const failedPayments = (ledger || []).filter(e => e.status === 'failed').length;

  return (
    <div className="space-y-6">
      {/* Date Filter */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5" />
            <CardTitle>Date Range Filter</CardTitle>
          </div>
          <DateRangePicker
            startDate={dateFilter.startDate}
            endDate={dateFilter.endDate}
            onStartDateChange={dateFilter.setStartDate}
            onEndDateChange={dateFilter.setEndDate}
            onPresetSelect={dateFilter.applyPreset}
            onClear={dateFilter.reset}
          />
        </CardHeader>
      </Card>

      {/* Financial Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Billed</CardDescription>
            <CardTitle className="text-2xl">₦{totalBilled.toFixed(2)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              All invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Settled</CardDescription>
            <CardTitle className="text-2xl text-green-600">₦{totalSettled.toFixed(2)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Successful payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Outstanding Fees</CardDescription>
            <CardTitle className="text-2xl text-orange-600">₦{outstandingFees.toFixed(2)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Pending + Billed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Failed Payments</CardDescription>
            <CardTitle className="text-2xl text-red-600">{failedPayments}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Requires attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Unsettled Platform Fees */}
      {unsettledFees.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <AlertCircle className="h-5 w-5" />
              Unsettled Platform Fees
            </CardTitle>
            <CardDescription>
              Fees awaiting payment - {unsettledFees.length} entries
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Days Outstanding</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unsettledFees.slice(0, 5).map((fee) => (
                  <TableRow key={fee.id}>
                    <TableCell>
                      {format(new Date(fee.created_at), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {fee.reference_type === 'booking' ? 'Booking' : 'QR Payment'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold">
                      ₦{Number(fee.fee_amount).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={fee.status === 'pending' ? 'secondary' : 'default'}>
                        {fee.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {Math.floor((Date.now() - new Date(fee.created_at).getTime()) / (1000 * 60 * 60 * 24))} days
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {unsettledFees.length > 5 && (
              <div className="text-sm text-muted-foreground text-center mt-4">
                + {unsettledFees.length - 5} more unsettled fees
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Platform Invoices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Platform Invoices
          </CardTitle>
          <CardDescription>Monthly billing invoices</CardDescription>
        </CardHeader>
        <CardContent>
          {!invoices || invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No invoices found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono text-sm">
                      {invoice.invoice_number}
                    </TableCell>
                    <TableCell>
                      {new Date(invoice.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      ₦{invoice.total_amount?.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(invoice.status)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadInvoice(invoice.id)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Summary</CardTitle>
          <CardDescription>Total payments received</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Total Paid</p>
              <p className="text-2xl font-bold">
                ₦{invoices?.filter(i => i.status === 'paid')
                  .reduce((sum, i) => sum + (i.total_amount || 0), 0)
                  .toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold">
                ₦{invoices?.filter(i => i.status === 'pending')
                  .reduce((sum, i) => sum + (i.total_amount || 0), 0)
                  .toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Overdue</p>
              <p className="text-2xl font-bold text-destructive">
                ₦{invoices?.filter(i => i.status === 'overdue')
                  .reduce((sum, i) => sum + (i.total_amount || 0), 0)
                  .toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
