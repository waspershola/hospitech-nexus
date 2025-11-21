import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/finance/tax';
import { ManagerApprovalModal } from '@/modules/payments/ManagerApprovalModal';

const rebateSchema = z.object({
  rebate_type: z.enum(['flat', 'percent']),
  amount: z.number().positive('Amount must be greater than 0'),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
});

type RebateForm = z.infer<typeof rebateSchema>;

interface RoomRebateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folioId: string;
  totalCharges: number;
  currentBalance: number;
}

export function RoomRebateModal({
  open,
  onOpenChange,
  folioId,
  totalCharges,
  currentBalance
}: RoomRebateModalProps) {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();
  const [calculatedRebate, setCalculatedRebate] = useState<number>(0);
  const [showManagerApproval, setShowManagerApproval] = useState(false);
  const [pendingRebateData, setPendingRebateData] = useState<RebateForm | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset
  } = useForm<RebateForm>({
    resolver: zodResolver(rebateSchema),
    defaultValues: {
      rebate_type: 'flat',
      amount: 0,
      reason: ''
    }
  });

  const rebateType = watch('rebate_type');
  const amount = watch('amount');

  // Calculate preview
  useEffect(() => {
    if (rebateType === 'flat') {
      setCalculatedRebate(amount || 0);
    } else {
      const percent = (amount || 0) / 100;
      setCalculatedRebate(totalCharges * percent);
    }
  }, [rebateType, amount, totalCharges]);

  const postRebateMutation = useMutation({
    mutationFn: async ({ data, approvalToken }: { data: RebateForm; approvalToken?: string }) => {
      console.log('[RoomRebateModal] REBATE-V1-PIN: Posting rebate', data);

      const { data: result, error } = await supabase.functions.invoke('post-room-rebate', {
        body: {
          folio_id: folioId,
          rebate_type: data.rebate_type,
          amount: data.amount,
          reason: data.reason,
          approval_token: approvalToken
        }
      });

      if (error) throw error;
      if (!result.success) throw new Error(result.error);

      return result;
    },
    onSuccess: (result) => {
      toast.success(`Room rebate of ${formatCurrency(result.rebate_amount, 'NGN')} applied successfully`);
      
      // Invalidate all folio-related queries
      queryClient.invalidateQueries({ queryKey: ['folio', folioId, tenantId] });
      queryClient.invalidateQueries({ queryKey: ['folio-transactions', folioId, tenantId] });
      queryClient.invalidateQueries({ queryKey: ['folio-ledger', folioId, tenantId] });
      queryClient.invalidateQueries({ queryKey: ['folio-by-id'] });

      reset();
      setShowManagerApproval(false);
      setPendingRebateData(null);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      console.error('[RoomRebateModal] REBATE-V1-PIN: Error', error);
      toast.error(`Failed to apply rebate: ${error.message}`);
    }
  });

  const onSubmit = (data: RebateForm) => {
    // Validate rebate doesn't exceed charges
    const finalAmount = rebateType === 'flat' ? data.amount : (totalCharges * data.amount / 100);
    if (finalAmount > totalCharges) {
      toast.error(`Rebate amount (${formatCurrency(finalAmount, 'NGN')}) exceeds total charges (${formatCurrency(totalCharges, 'NGN')})`);
      return;
    }

    // Room rebates always require manager approval (high-risk financial operation)
    setPendingRebateData(data);
    setShowManagerApproval(true);
  };

  return (
    <>
      <Dialog open={open && !showManagerApproval} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Apply Room Rebate</DialogTitle>
            <DialogDescription>
              Reduce the room charges for this folio. Requires manager approval.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Rebate Type */}
            <div>
              <Label>Rebate Type</Label>
              <RadioGroup
                value={rebateType}
                onValueChange={(value) => {
                  register('rebate_type').onChange({ target: { value } });
                }}
                className="flex gap-4 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="flat" id="flat" />
                  <Label htmlFor="flat" className="font-normal cursor-pointer">
                    Flat Amount (₦)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="percent" id="percent" />
                  <Label htmlFor="percent" className="font-normal cursor-pointer">
                    Percentage (%)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Amount */}
            <div>
              <Label htmlFor="amount">
                {rebateType === 'flat' ? 'Amount (₦)' : 'Percentage (%)'}
              </Label>
              <Input
                id="amount"
                type="number"
                step={rebateType === 'flat' ? '0.01' : '0.1'}
                {...register('amount', { valueAsNumber: true })}
                placeholder={rebateType === 'flat' ? '5000.00' : '10'}
              />
              {errors.amount && (
                <p className="text-sm text-destructive mt-1">{errors.amount.message}</p>
              )}
            </div>

            {/* Reason */}
            <div>
              <Label htmlFor="reason">Reason for Rebate *</Label>
              <Textarea
                id="reason"
                {...register('reason')}
                placeholder="e.g., AC malfunction compensation, noise disturbance, service recovery"
                rows={3}
              />
              {errors.reason && (
                <p className="text-sm text-destructive mt-1">{errors.reason.message}</p>
              )}
            </div>

            {/* Preview */}
            {calculatedRebate > 0 && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Current Charges:</span>
                  <span className="font-medium">{formatCurrency(totalCharges, 'NGN')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Rebate Amount:</span>
                  <span className="font-medium text-destructive">
                    -{formatCurrency(calculatedRebate, 'NGN')}
                  </span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t">
                  <span className="font-semibold">New Charges:</span>
                  <span className="font-bold">
                    {formatCurrency(totalCharges - calculatedRebate, 'NGN')}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-semibold">New Balance:</span>
                  <span className={`font-bold ${(currentBalance - calculatedRebate) > 0 ? 'text-destructive' : 'text-green-600'}`}>
                    {formatCurrency(currentBalance - calculatedRebate, 'NGN')}
                  </span>
                </div>
              </div>
            )}

            {/* Warning */}
            <div className="flex gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg">
              <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-warning">Manager Approval Required</p>
                <p className="text-muted-foreground">
                  This rebate cannot be reversed and requires manager PIN authorization.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={postRebateMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={postRebateMutation.isPending || calculatedRebate === 0}
              >
                {postRebateMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Request Approval
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Manager Approval Modal */}
      <ManagerApprovalModal
        open={showManagerApproval}
        amount={calculatedRebate}
        type="room_rebate"
        actionReference={folioId}
        onApprove={(reason, approvalToken) => {
          console.log('[RoomRebateModal] REBATE-V1-PIN: Manager approved', { reason, approvalToken });
          if (pendingRebateData) {
            postRebateMutation.mutate({ data: pendingRebateData, approvalToken });
          }
        }}
        onReject={() => {
          setShowManagerApproval(false);
          setPendingRebateData(null);
          toast.info('Room rebate cancelled');
        }}
      />
    </>
  );
}
