import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { usePlatformFeeConfig } from '@/hooks/usePlatformFeeConfig';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, TrendingUp, CreditCard, Clock, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

export function PlatformFeesTab() {
  const { tenantId } = useAuth();
  const { config, summary, ledger, isLoading } = usePlatformFeeConfig(tenantId || undefined);

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

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Billed Amount</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₦{summary.billed_amount.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Processed fees</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₦{summary.pending_amount.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Awaiting billing</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paid Amount</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₦{summary.paid_amount.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Settled invoices</p>
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

      {/* Fee Ledger */}
      <Card>
        <CardHeader>
          <CardTitle>Fee Ledger</CardTitle>
          <CardDescription>Detailed transaction history</CardDescription>
        </CardHeader>
        <CardContent>
          {ledger && ledger.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
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
                {ledger.map((entry) => (
                  <TableRow key={entry.id}>
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
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">No fee transactions yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
