import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const walletOpSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  type: z.enum(['credit', 'debit']),
  description: z.string().min(1, 'Description is required'),
});

type WalletOpForm = z.infer<typeof walletOpSchema>;

interface WalletOperationDialogProps {
  open: boolean;
  onClose: () => void;
  walletId: string;
  walletName: string;
}

export function WalletOperationDialog({ 
  open, 
  onClose, 
  walletId,
  walletName 
}: WalletOperationDialogProps) {
  const { tenantId, user } = useAuth();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<WalletOpForm>({
    resolver: zodResolver(walletOpSchema),
    defaultValues: {
      amount: 0,
      type: 'credit',
      description: '',
    },
  });

  const onSubmit = async (data: WalletOpForm) => {
    if (!tenantId) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('wallet_transactions')
        .insert([{
          wallet_id: walletId,
          tenant_id: tenantId,
          type: data.type,
          amount: data.amount,
          description: data.description,
          created_by: user?.id,
        }]);

      if (error) throw error;

      toast.success(`Wallet ${data.type === 'credit' ? 'credited' : 'debited'} successfully`);
      queryClient.invalidateQueries({ queryKey: ['wallets', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions', tenantId] });
      form.reset();
      onClose();
    } catch (error: any) {
      toast.error(`Operation failed: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Wallet Operation</DialogTitle>
          <DialogDescription>
            Add or withdraw funds from {walletName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Operation Type</Label>
            <Select
              value={form.watch('type')}
              onValueChange={(value: 'credit' | 'debit') => form.setValue('type', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="credit">
                  <div className="flex items-center gap-2">
                    <ArrowUpCircle className="w-4 h-4 text-green-500" />
                    Credit (Add Funds)
                  </div>
                </SelectItem>
                <SelectItem value="debit">
                  <div className="flex items-center gap-2">
                    <ArrowDownCircle className="w-4 h-4 text-red-500" />
                    Debit (Withdraw Funds)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (₦)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              {...form.register('amount', { valueAsNumber: true })}
              placeholder="0.00"
            />
            {form.formState.errors.amount && (
              <p className="text-sm text-destructive">{form.formState.errors.amount.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...form.register('description')}
              placeholder="Manual adjustment, top-up, etc."
              rows={3}
            />
            {form.formState.errors.description && (
              <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="flex-1">
              {submitting ? 'Processing...' : 'Confirm'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
