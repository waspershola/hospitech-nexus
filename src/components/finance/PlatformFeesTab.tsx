import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { usePlatformFeeConfig } from '@/hooks/usePlatformFeeConfig';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, TrendingUp, CreditCard, Clock, CheckCircle2, AlertTriangle, XCircle, DollarSign, Receipt } from 'lucide-react';
import { format } from 'date-fns';
import { DisputeFeeDialog } from './DisputeFeeDialog';
import { PayPlatformFeesDialog } from './PayPlatformFeesDialog';
import { TenantPaymentHistoryTab } from './TenantPaymentHistoryTab';

export function PlatformFeesTab() {
  const { tenantId } = useAuth();
  const { config, summary, ledger, isLoading } = usePlatformFeeConfig(tenantId || undefined);
  const [selectedLedgerIds, setSelectedLedgerIds] = useState<string[]>([]);
  const [disputeDialogOpen, setDisputeDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  // Calculate total disputed amount
  const totalDisputedAmount = ledger
    ?.filter(entry => selectedLedgerIds.includes(entry.id))
    .reduce((sum, entry) => sum + entry.fee_amount, 0) || 0;

  // Only allow disputing pending or billed fees
  const disputableFees = ledger?.filter(entry => 
    entry.status === 'pending' || entry.status === 'billed'
  ) || [];

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLedgerIds(disputableFees.map(entry => entry.id));
    } else {
      setSelectedLedgerIds([]);
    }
  };

  const handleSelectEntry = (entryId: string, checked: boolean) => {
    if (checked) {
      setSelectedLedgerIds(prev => [...prev, entryId]);
    } else {
      setSelectedLedgerIds(prev => prev.filter(id => id !== entryId));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!config) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No fee configuration found for your property.</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, label: 'Pending', className: '' },
      billed: { variant: 'default' as const, label: 'Billed', className: '' },
      paid: { variant: 'default' as const, label: 'Paid', className: 'bg-green-500' },
      settled: { variant: 'default' as const, label: 'Settled', className: 'bg-green-600' },
      failed: { variant: 'destructive' as const, label: 'Failed', className: '' },
      waived: { variant: 'outline' as const, label: 'Waived', className: '' },
    };
    
    const statusInfo = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <Badge variant={statusInfo.variant} className={statusInfo.className || undefined}>
        {statusInfo.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-semibold mb-2">Platform Fees</h2>
        <p className="text-muted-foreground">
          View your platform fee configuration and transaction history
        </p>
      </div>

      {/* Fee Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Fees</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₦{summary.total_fees.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">All-time platform fees</p>
            </CardContent>
          </Card>

          <Card className="border-orange-200 dark:border-orange-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding Fees</CardTitle>
              <DollarSign className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                ₦{summary.outstanding_amount.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Requires payment</p>
              {summary.outstanding_amount > 0 && (
                <Button 
                  size="sm" 
                  className="mt-3 w-full"
                  onClick={() => setPaymentDialogOpen(true)}
                >
                  Pay Now
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Settled Amount</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                ₦{summary.settled_amount.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Successfully paid</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed Payments</CardTitle>
              <XCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                ₦{summary.failed_amount.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Payment failures</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Current Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Current Fee Configuration</CardTitle>
          <CardDescription>Your platform fee settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Fee Type</p>
              <p className="text-base font-semibold capitalize">{config.fee_type}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Billing Cycle</p>
              <p className="text-base font-semibold capitalize">{config.billing_cycle}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Booking Fee</p>
              <p className="text-base font-semibold">
                {config.fee_type === 'percentage' ? `${config.booking_fee}%` : `₦${config.booking_fee}`}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">QR Payment Fee</p>
              <p className="text-base font-semibold">
                {config.fee_type === 'percentage' ? `${config.qr_fee}%` : `₦${config.qr_fee}`}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Fee Payer</p>
              <p className="text-base font-semibold capitalize">{config.payer}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <Badge variant={config.active ? 'default' : 'secondary'}>
                {config.active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fee Ledger and Payment History Tabs */}
      <Tabs defaultValue="ledger" className="space-y-4">
        <TabsList>
          <TabsTrigger value="ledger">
            <CreditCard className="h-4 w-4 mr-2" />
            Fee Ledger
          </TabsTrigger>
          <TabsTrigger value="payments">
            <Receipt className="h-4 w-4 mr-2" />
            Payment History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ledger">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Fee Ledger</CardTitle>
                  <CardDescription>Detailed transaction history</CardDescription>
                </div>
                {disputableFees.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => setDisputeDialogOpen(true)}
                    disabled={selectedLedgerIds.length === 0}
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Dispute Selected ({selectedLedgerIds.length})
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {ledger && ledger.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      {disputableFees.length > 0 && (
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedLedgerIds.length === disputableFees.length && disputableFees.length > 0}
                            onCheckedChange={handleSelectAll}
                            aria-label="Select all disputable fees"
                          />
                        </TableHead>
                      )}
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Base Amount</TableHead>
                      <TableHead>Fee</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Cycle</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledger.map((entry) => {
                      const isDisputable = entry.status === 'pending' || entry.status === 'billed';
                      return (
                        <TableRow key={entry.id}>
                          {disputableFees.length > 0 && (
                            <TableCell>
                              {isDisputable ? (
                                <Checkbox
                                  checked={selectedLedgerIds.includes(entry.id)}
                                  onCheckedChange={(checked) => handleSelectEntry(entry.id, checked as boolean)}
                                  aria-label={`Select fee ${entry.id}`}
                                />
                              ) : null}
                            </TableCell>
                          )}
                          <TableCell>{format(new Date(entry.created_at), 'MMM dd, yyyy')}</TableCell>
                          <TableCell className="capitalize">{entry.reference_type}</TableCell>
                          <TableCell>₦{entry.base_amount.toLocaleString()}</TableCell>
                          <TableCell>₦{entry.fee_amount.toLocaleString()}</TableCell>
                          <TableCell>
                            {entry.fee_type === 'percentage' ? `${entry.rate}%` : `₦${entry.rate}`}
                          </TableCell>
                          <TableCell className="capitalize">{entry.billing_cycle}</TableCell>
                          <TableCell>{getStatusBadge(entry.status)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">No fee transactions yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <TenantPaymentHistoryTab tenantId={tenantId || undefined} />
        </TabsContent>
      </Tabs>

      <DisputeFeeDialog
        open={disputeDialogOpen}
        onOpenChange={setDisputeDialogOpen}
        selectedLedgerIds={selectedLedgerIds}
        totalDisputedAmount={totalDisputedAmount}
      />

      <PayPlatformFeesDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        tenantId={tenantId || undefined}
        outstandingAmount={summary?.outstanding_amount || 0}
      />
    </div>
  );
}
