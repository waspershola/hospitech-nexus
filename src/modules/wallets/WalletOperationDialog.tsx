import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWallets } from '@/hooks/useWallets';
import { toast } from 'sonner';

const operationSchema = z.object({
  amount: z.number().positive('Amount must be greater than 0'),
  target_wallet_id: z.string().optional(),
  description: z.string().optional(),
  reason: z.string().optional(),
});

type OperationForm = z.infer<typeof operationSchema>;

interface WalletOperationDialogProps {
  open: boolean;
  onClose: () => void;
  wallet: any;
  operationType: 'topup' | 'withdraw' | 'transfer' | 'adjust';
}

export function WalletOperationDialog({
  open,
  onClose,
  wallet,
  operationType,
}: WalletOperationDialogProps) {
  const { tenantId, user } = useAuth();
  const { wallets } = useWallets();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<OperationForm>({
    resolver: zodResolver(operationSchema),
  });

  const otherWallets = wallets.filter(w => w.id !== wallet.id);

  const operationMutation = useMutation({
    mutationFn: async (data: OperationForm) => {
      if (!tenantId) throw new Error('No tenant ID');

      let txnType: 'credit' | 'debit' = 'credit';
      let description = data.description || '';

      switch (operationType) {
        case 'topup':
          txnType = 'credit';
          description = description || 'Wallet top-up';
          break;
        case 'withdraw':
          txnType = 'debit';
          description = description || 'Wallet withdrawal';
          break;
        case 'transfer':
          if (!data.target_wallet_id) throw new Error('Target wallet required');
          // Create debit for source wallet
          await supabase.from('wallet_transactions').insert([{
            tenant_id: tenantId,
            wallet_id: wallet.id,
            type: 'debit',
            amount: data.amount,
            description: `Transfer to ${wallets.find(w => w.id === data.target_wallet_id)?.name || 'wallet'}`,
            created_by: user?.id,
          }]);
          // Create credit for target wallet
          await supabase.from('wallet_transactions').insert([{
            tenant_id: tenantId,
            wallet_id: data.target_wallet_id,
            type: 'credit',
            amount: data.amount,
            description: `Transfer from ${wallet.name || 'wallet'}`,
            created_by: user?.id,
          }]);
          return;
        case 'adjust':
          txnType = data.amount > 0 ? 'credit' : 'debit';
          description = data.reason || 'Balance adjustment';
          break;
      }

      const { error } = await supabase.from('wallet_transactions').insert([{
        tenant_id: tenantId,
        wallet_id: wallet.id,
        type: txnType,
        amount: Math.abs(data.amount),
        description,
        created_by: user?.id,
      }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallets', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['wallet-detail', wallet.id] });
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions', wallet.id] });
      toast.success(`${operationType === 'topup' ? 'Top-up' : operationType === 'withdraw' ? 'Withdrawal' : operationType === 'transfer' ? 'Transfer' : 'Adjustment'} completed successfully`);
      reset();
      onClose();
    },
    onError: (error: Error) => {
      toast.error(`Operation failed: ${error.message}`);
    },
  });

  const onSubmit = (data: OperationForm) => {
    operationMutation.mutate(data);
  };

  const getTitle = () => {
    switch (operationType) {
      case 'topup': return 'Top Up Wallet';
      case 'withdraw': return 'Withdraw from Wallet';
      case 'transfer': return 'Transfer to Another Wallet';
      case 'adjust': return 'Adjust Wallet Balance';
    }
  };

  const getDescription = () => {
    switch (operationType) {
      case 'topup': return 'Add funds to this wallet';
      case 'withdraw': return 'Remove funds from this wallet';
      case 'transfer': return 'Transfer funds to another wallet';
      case 'adjust': return 'Make a balance adjustment (positive or negative)';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">
              Amount *
              {operationType === 'adjust' && ' (use negative for deductions)'}
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register('amount', { valueAsNumber: true })}
            />
            {errors.amount && (
              <p className="text-sm text-destructive">{errors.amount.message}</p>
            )}
          </div>

          {operationType === 'transfer' && (
            <div className="space-y-2">
              <Label htmlFor="target_wallet_id">Target Wallet *</Label>
              <Select
                value={watch('target_wallet_id')}
                onValueChange={(value) => setValue('target_wallet_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select wallet" />
                </SelectTrigger>
                <SelectContent>
                  {otherWallets.map(w => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name || `${w.wallet_type} wallet`} - {w.currency} {Number(w.balance).toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.target_wallet_id && (
                <p className="text-sm text-destructive">{errors.target_wallet_id.message}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor={operationType === 'adjust' ? 'reason' : 'description'}>
              {operationType === 'adjust' ? 'Reason (Required for adjustments)' : 'Description (Optional)'}
            </Label>
            <Textarea
              id={operationType === 'adjust' ? 'reason' : 'description'}
              placeholder={operationType === 'adjust' ? 'Explain the reason for this adjustment...' : 'Add any additional notes...'}
              {...register(operationType === 'adjust' ? 'reason' : 'description')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={operationMutation.isPending}>
              {operationMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirm {operationType === 'topup' ? 'Top-up' : operationType === 'withdraw' ? 'Withdrawal' : operationType === 'transfer' ? 'Transfer' : 'Adjustment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
