import { usePayments } from '@/hooks/usePayments';
import { useWalletTransactions } from '@/hooks/useWalletTransactions';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CheckCircle2, XCircle, Clock, Receipt } from 'lucide-react';
import { PaymentMetadataDisplay } from '@/components/shared/PaymentMetadataDisplay';

interface PaymentDrawerProps {
  paymentId: string | null;
  open: boolean;
  onClose: () => void;
}

export function PaymentDrawer({ paymentId, open, onClose }: PaymentDrawerProps) {
  const { payments } = usePayments();
  const payment = payments.find(p => p.id === paymentId);
  
  // Fetch wallet transactions linked to this payment
  const { data: allTransactions = [] } = useWalletTransactions();
  const walletTransactions = allTransactions.filter(
    t => t.payment_id === paymentId
  );

  if (!payment) return null;

  const getStatusIcon = () => {
    switch (payment.status) {
      case 'paid':
        return <CheckCircle2 className="h-5 w-5 text-status-available" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <Clock className="h-5 w-5 text-warning" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-status-available/10 text-status-available border-status-available/20';
      case 'pending':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'failed':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'refunded':
        return 'bg-muted text-muted-foreground border-border';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const handleVerify = () => {
    // TODO: Implement payment verification
    console.log('Verify payment:', payment.id);
  };

  const handleRefund = () => {
    // TODO: Implement payment refund
    console.log('Refund payment:', payment.id);
  };

  const handleViewReceipt = () => {
    // TODO: Implement receipt viewing
    console.log('View receipt:', payment.id);
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {getStatusIcon()}
            Payment Details
          </SheetTitle>
          <SheetDescription>
            Reference: {payment.transaction_ref || 'N/A'}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge variant="outline" className={getStatusColor(payment.status)}>
              {payment.status}
            </Badge>
          </div>

          <Separator />

          {/* Payment Information */}
          <div className="space-y-3">
            <h3 className="font-display text-lg">Payment Information</h3>
            <div className="grid gap-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-semibold">
                  {payment.currency} {Number(payment.amount).toFixed(2)}
                </span>
              </div>
              
              {/* Tax Breakdown */}
              {payment.metadata?.tax_breakdown && (
                <div className="bg-muted/30 rounded-lg p-3 space-y-2 text-sm">
                  <p className="font-medium text-muted-foreground">Tax Breakdown</p>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Base Amount</span>
                      <span>{payment.currency} {Number((payment.metadata.tax_breakdown as any).baseAmount || 0).toFixed(2)}</span>
                    </div>
                    {Number((payment.metadata.tax_breakdown as any).vatAmount || 0) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          VAT ({(payment.metadata.tax_breakdown as any).vatRate}%)
                        </span>
                        <span>{payment.currency} {Number((payment.metadata.tax_breakdown as any).vatAmount || 0).toFixed(2)}</span>
                      </div>
                    )}
                    {Number((payment.metadata.tax_breakdown as any).serviceChargeAmount || 0) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Service ({(payment.metadata.tax_breakdown as any).serviceCharge}%)
                        </span>
                        <span>{payment.currency} {Number((payment.metadata.tax_breakdown as any).serviceChargeAmount || 0).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Method</span>
                <span className="capitalize">{payment.method || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Provider</span>
                <span>{payment.method_provider || 'N/A'}</span>
              </div>
              {payment.payment_type && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="capitalize">{payment.payment_type}</span>
                </div>
              )}
              {payment.department && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Department</span>
                  <span>{payment.department}</span>
                </div>
              )}
              {payment.location && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Location</span>
                  <span>{payment.location}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date</span>
                <span>{new Date(payment.created_at).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {payment.provider_reference && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="font-display text-lg">Provider Details</h3>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Provider Reference</span>
                  <span className="font-mono text-sm">{payment.provider_reference}</span>
                </div>
              </div>
            </>
          )}

          {walletTransactions.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="font-display text-lg">Wallet Transactions</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {walletTransactions.map((txn) => (
                      <TableRow key={txn.id}>
                        <TableCell className="capitalize">{txn.type}</TableCell>
                        <TableCell className="font-medium">
                          {Number(txn.amount).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(txn.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          <PaymentMetadataDisplay 
            metadata={payment.metadata as Record<string, any>} 
            title="Additional Information"
            showSeparator={true}
          />

          <Separator />

          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            {payment.status === 'pending' && (
              <Button onClick={handleVerify} className="w-full">
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Verify Payment
              </Button>
            )}
            {payment.status === 'paid' && (
              <>
                <Button variant="outline" onClick={handleViewReceipt} className="w-full">
                  <Receipt className="mr-2 h-4 w-4" />
                  View Receipt
                </Button>
                <Button variant="outline" onClick={handleRefund} className="w-full">
                  Refund Payment
                </Button>
              </>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
