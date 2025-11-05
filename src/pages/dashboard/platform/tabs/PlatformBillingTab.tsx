import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePlatformInvoices, usePlatformBillingMetrics } from '@/hooks/usePlatformBilling';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, FileText, TrendingUp, Calendar, PlayCircle } from 'lucide-react';
import { format } from 'date-fns';

export function PlatformBillingTab() {
  const { invoices, isLoading, updateInvoiceStatus } = usePlatformInvoices();
  const { processBillingCycle } = usePlatformBillingMetrics();
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);

  const handleStatusChange = async (invoiceId: string, status: string) => {
    await updateInvoiceStatus.mutateAsync({ 
      id: invoiceId, 
      status: status as any 
    });
  };

  const handleProcessBilling = async () => {
    await processBillingCycle.mutateAsync();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: 'secondary',
      paid: 'default',
      overdue: 'destructive',
      cancelled: 'outline',
    };

    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const totalRevenue = invoices?.reduce((sum, inv) => sum + (inv.amount_due || 0), 0) || 0;
  const paidRevenue = invoices?.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + (inv.amount_paid || 0), 0) || 0;
  const pendingRevenue = invoices?.filter(inv => inv.status === 'pending').reduce((sum, inv) => sum + (inv.amount_due || 0), 0) || 0;

  if (isLoading) {
    return <div className="p-8">Loading billing data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Billing & Revenue</h2>
          <p className="text-muted-foreground">
            Manage invoices, usage tracking, and revenue
          </p>
        </div>
        <Button onClick={handleProcessBilling} disabled={processBillingCycle.isPending}>
          <PlayCircle className="mr-2 h-4 w-4" />
          {processBillingCycle.isPending ? 'Processing...' : 'Process Billing Cycle'}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {invoices?.length || 0} invoices total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{paidRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {invoices?.filter(inv => inv.status === 'paid').length || 0} paid invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Revenue</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{pendingRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {invoices?.filter(inv => inv.status === 'pending').length || 0} pending invoices
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>
            All platform invoices across tenants
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!invoices || invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No invoices generated yet. Process the billing cycle to generate invoices.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Base Amount</TableHead>
                  <TableHead>Overage</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                 {invoices.map((invoice: any) => {
                  const baseAmount = invoice.invoice_payload?.base_amount || 0;
                  const overageAmount = invoice.invoice_payload?.sms_overage_cost || 0;
                  const totalAmount = invoice.amount_due || 0;

                  return (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        {invoice.platform_tenants?.name || 'Unknown'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(invoice.cycle_start), 'MMM dd')} - {format(new Date(invoice.cycle_end), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>₦{baseAmount.toLocaleString()}</TableCell>
                      <TableCell>
                        {overageAmount > 0 ? (
                          <span className="text-orange-600">
                            +₦{overageAmount.toLocaleString()}
                          </span>
                        ) : (
                          '₦0'
                        )}
                      </TableCell>
                      <TableCell className="font-semibold">
                        ₦{totalAmount.toLocaleString()}
                      </TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(invoice.created_at), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Select
                          value={invoice.status}
                          onValueChange={(value) => handleStatusChange(invoice.id, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="overdue">Overdue</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Billing Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Automated Billing</h4>
            <p className="text-sm text-muted-foreground mb-2">
              The billing cycle runs automatically on the 1st of each month via cron job.
              You can also trigger it manually using the "Process Billing Cycle" button above.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Billing Process</h4>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>System aggregates usage for all tenants from the current billing period</li>
              <li>Calculates base subscription fee from tenant's plan</li>
              <li>Calculates overage charges for usage exceeding plan limits</li>
              <li>Generates invoices with detailed line items</li>
              <li>Sends invoice notifications to tenant admins (future feature)</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
