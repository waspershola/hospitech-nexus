import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTenantPaymentHistory } from '@/hooks/useTenantPaymentHistory';
import { useInitiatePlatformPayment } from '@/hooks/useInitiatePlatformPayment';
import { Loader2, Receipt, CheckCircle2, XCircle, Clock, RefreshCw, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TenantPaymentHistoryTabProps {
  tenantId?: string;
}

export function TenantPaymentHistoryTab({ tenantId }: TenantPaymentHistoryTabProps) {
  const { data: payments, isLoading } = useTenantPaymentHistory(tenantId);
  const { mutate: retryPayment, isPending: isRetrying } = useInitiatePlatformPayment();
  const [retryPaymentId, setRetryPaymentId] = useState<string | null>(null);
  const [showRetryDialog, setShowRetryDialog] = useState(false);

  const handleRetryClick = (payment: any) => {
    setRetryPaymentId(payment.id);
    setShowRetryDialog(true);
  };

  const handleRetryConfirm = () => {
    const payment = payments?.find(p => p.id === retryPaymentId);
    if (!payment || !payment.payment_method_id || !tenantId) return;

    retryPayment({
      tenant_id: tenantId,
      payment_method_id: payment.payment_method_id,
      ledger_ids: payment.ledger_ids,
    });

    setShowRetryDialog(false);
    setRetryPaymentId(null);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      initiated: { 
        variant: 'secondary' as const, 
        label: 'Initiated', 
        icon: Clock,
        className: '' 
      },
      processing: { 
        variant: 'default' as const, 
        label: 'Processing', 
        icon: RefreshCw,
        className: 'bg-blue-500' 
      },
      successful: { 
        variant: 'default' as const, 
        label: 'Successful', 
        icon: CheckCircle2,
        className: 'bg-green-600' 
      },
      failed: { 
        variant: 'destructive' as const, 
        label: 'Failed', 
        icon: XCircle,
        className: '' 
      },
      refunded: { 
        variant: 'outline' as const, 
        label: 'Refunded', 
        icon: RefreshCw,
        className: '' 
      },
    };
    
    const statusInfo = statusConfig[status as keyof typeof statusConfig] || statusConfig.initiated;
    const Icon = statusInfo.icon;
    
    return (
      <Badge variant={statusInfo.variant} className={statusInfo.className || undefined}>
        <Icon className="h-3 w-3 mr-1" />
        {statusInfo.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Payment History
          </CardTitle>
          <CardDescription>
            Your platform fee payment transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {payments && payments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Payment Reference</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Fees Paid</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">
                          {format(new Date(payment.created_at), 'MMM dd, yyyy')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(payment.created_at), 'HH:mm')}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {payment.payment_reference}
                    </TableCell>
                    <TableCell className="font-semibold">
                      ₦{payment.total_amount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{payment.provider}</div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(payment.status)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {payment.ledger_ids.length} {payment.ledger_ids.length === 1 ? 'fee' : 'fees'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {payment.status === 'failed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRetryClick(payment)}
                          disabled={isRetrying}
                          className="gap-2"
                        >
                          <RefreshCw className={`h-3 w-3 ${isRetrying ? 'animate-spin' : ''}`} />
                          Retry Payment
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Receipt className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No payment history yet.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your payment transactions will appear here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showRetryDialog} onOpenChange={setShowRetryDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              Retry Failed Payment
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                You are about to retry a failed payment. This will create a new payment
                attempt for the same platform fees.
              </p>
              {retryPaymentId && payments && (
                <div className="bg-muted rounded-lg p-3 mt-3">
                  <p className="text-sm font-medium text-foreground">
                    Amount: ₦{payments.find(p => p.id === retryPaymentId)?.total_amount.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {payments.find(p => p.id === retryPaymentId)?.ledger_ids.length} fee entries
                  </p>
                </div>
              )}
              <p className="text-sm text-muted-foreground mt-2">
                You will be redirected to the payment gateway to complete the transaction.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRetryConfirm}>
              Retry Payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
