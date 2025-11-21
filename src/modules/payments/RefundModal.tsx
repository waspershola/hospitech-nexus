import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, RotateCcw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ManagerApprovalModal } from '@/modules/payments/ManagerApprovalModal';

const refundSchema = z.object({
  amount: z.number().positive('Amount must be greater than 0'),
  reason: z.string().min(5, 'Please provide a reason for the refund'),
});

type RefundForm = z.infer<typeof refundSchema>;

interface RefundModalProps {
  open: boolean;
  onClose: () => void;
  payment: any;
  bookingId: string;
}

export function RefundModal({ open, onClose, payment, bookingId }: RefundModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isPartialRefund, setIsPartialRefund] = useState(false);
  const [showManagerApproval, setShowManagerApproval] = useState(false);
  const [pendingRefundData, setPendingRefundData] = useState<RefundForm | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RefundForm>({
    resolver: zodResolver(refundSchema),
    defaultValues: {
      amount: Number(payment?.amount) || 0,
      reason: '',
    },
  });

  const refundAmount = watch('amount');
  const maxRefund = Number(payment?.amount) || 0;

  const refundMutation = useMutation({
    mutationFn: async ({ data, approvalToken }: { data: RefundForm; approvalToken?: string }) => {
      if (!payment?.id) throw new Error('Payment ID is missing');

      // Create a refund payment record
      const { data: refundRecord, error: refundError } = await supabase
        .from('payments')
        .insert({
          tenant_id: payment.tenant_id,
          booking_id: bookingId,
          guest_id: payment.guest_id,
          organization_id: payment.organization_id,
          amount: -data.amount, // Negative amount for refund
          expected_amount: -data.amount,
          payment_type: 'refund',
          method: payment.method,
          status: 'completed',
          transaction_ref: `REFUND-${payment.transaction_ref || Date.now()}`,
          recorded_by: user?.id,
          department: payment.department,
          metadata: {
            original_payment_id: payment.id,
            refund_reason: data.reason,
            refund_type: data.amount === maxRefund ? 'full' : 'partial',
            refunded_at: new Date().toISOString(),
            manager_approved: !!approvalToken,
            approval_token_used: !!approvalToken,
          },
        })
        .select()
        .single();

      if (refundError) throw refundError;

      // Update original payment status to refunded (if full refund)
      if (data.amount === maxRefund) {
        const { error: updateError } = await supabase
          .from('payments')
          .update({ 
            status: 'refunded',
            metadata: {
              ...payment.metadata,
              refunded: true,
              refund_payment_id: refundRecord.id,
              refund_reason: data.reason,
              refunded_at: new Date().toISOString(),
            }
          })
          .eq('id', payment.id);

        if (updateError) throw updateError;
      }

      // If payment was linked to wallet, reverse the transaction
      if (payment.wallet_id) {
        const { error: walletError } = await supabase
          .from('wallet_transactions')
          .insert({
            tenant_id: payment.tenant_id,
            wallet_id: payment.wallet_id,
            type: 'debit', // Debit to reverse the credit
            amount: data.amount,
            payment_id: refundRecord.id,
            description: `Refund for payment ${payment.transaction_ref}`,
            created_by: user?.id,
            department: payment.department,
            metadata: {
              refund: true,
              original_payment_id: payment.id,
              reason: data.reason,
            },
          });

        if (walletError) throw walletError;
      }

      return refundRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-history', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
      
      // Reset states
      setShowManagerApproval(false);
      setPendingRefundData(null);
      
      toast.success('Refund processed successfully');
      onClose();
    },
    onError: (error: Error) => {
      toast.error(`Failed to process refund: ${error.message}`);
    },
  });

  const onSubmit = (data: RefundForm) => {
    if (data.amount > maxRefund) {
      toast.error('Refund amount cannot exceed original payment amount');
      return;
    }
    
    // All refunds require manager PIN approval
    setPendingRefundData(data);
    setShowManagerApproval(true);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-primary" />
            <DialogTitle>Process Refund</DialogTitle>
          </div>
          <DialogDescription>
            Refund payment to the guest. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1 text-sm">
                <p><strong>Original Amount:</strong> ₦{maxRefund.toLocaleString()}</p>
                <p><strong>Payment Method:</strong> {payment?.method}</p>
                <p><strong>Reference:</strong> {payment?.transaction_ref}</p>
              </div>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="amount">Refund Amount *</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsPartialRefund(!isPartialRefund)}
              >
                {isPartialRefund ? 'Full Refund' : 'Partial Refund'}
              </Button>
            </div>
            <Input
              id="amount"
              type="number"
              step="0.01"
              max={maxRefund}
              disabled={!isPartialRefund}
              {...register('amount', { valueAsNumber: true })}
            />
            {errors.amount && (
              <p className="text-sm text-destructive">{errors.amount.message}</p>
            )}
            {refundAmount > maxRefund && (
              <p className="text-sm text-destructive">
                Refund amount cannot exceed ₦{maxRefund.toLocaleString()}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Refund *</Label>
            <Textarea
              id="reason"
              placeholder="Explain why this refund is being processed..."
              rows={3}
              {...register('reason')}
            />
            {errors.reason && (
              <p className="text-sm text-destructive">{errors.reason.message}</p>
            )}
          </div>

          {payment?.wallet_id && (
            <Alert>
              <AlertDescription className="text-sm">
                This payment was linked to a wallet. The refund will automatically
                reverse the wallet transaction.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={refundMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              className="flex-1"
              disabled={refundMutation.isPending || refundAmount > maxRefund}
            >
              {refundMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Request Manager Approval
            </Button>
          </div>
        </form>
      </DialogContent>

      {/* Manager Approval Modal */}
      <ManagerApprovalModal
        open={showManagerApproval}
        amount={pendingRefundData?.amount || 0}
        type="refund"
        actionReference={payment?.id}
        onApprove={(reason, approvalToken) => {
          console.log('[RefundModal] Manager approved refund', { reason, approvalToken });
          if (pendingRefundData) {
            refundMutation.mutate({ data: pendingRefundData, approvalToken });
          }
        }}
        onReject={() => {
          setShowManagerApproval(false);
          setPendingRefundData(null);
          toast.info('Refund cancelled - manager approval denied');
        }}
      />
    </Dialog>
  );
}
