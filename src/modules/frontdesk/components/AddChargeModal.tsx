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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useRecordPayment } from '@/hooks/useRecordPayment';
import { useFinanceProviders } from '@/hooks/useFinanceProviders';
import { useWallets } from '@/hooks/useWallets';

const chargeSchema = z.object({
  amount: z.number().positive('Amount must be greater than 0'),
  method: z.string().min(1, 'Payment method is required'),
  provider_id: z.string().optional(),
  wallet_id: z.string().optional(),
  notes: z.string().optional(),
});

type ChargeForm = z.infer<typeof chargeSchema>;

interface AddChargeModalProps {
  open: boolean;
  onClose: () => void;
  bookingId: string;
  roomNumber: string;
}

export function AddChargeModal({
  open,
  onClose,
  bookingId,
  roomNumber,
}: AddChargeModalProps) {
  const { mutate: recordPayment, isPending } = useRecordPayment();
  const { providers } = useFinanceProviders();
  const { wallets } = useWallets('department');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ChargeForm>({
    resolver: zodResolver(chargeSchema),
  });

  const selectedMethod = watch('method');
  const activeProviders = providers.filter(p => p.status === 'active');

  const onSubmit = (data: ChargeForm) => {
    const transaction_ref = `CHG-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    recordPayment(
      {
        transaction_ref,
        booking_id: bookingId || undefined,
        amount: data.amount,
        method: data.method,
        provider_id: data.provider_id,
        wallet_id: data.wallet_id,
        department: 'front_desk',
        metadata: {
          notes: data.notes,
          room_number: roomNumber,
          charge_type: 'manual',
        },
      },
      {
        onSuccess: () => {
          reset();
          onClose();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] rounded-2xl">
        <DialogHeader>
          <DialogTitle>Add Charge</DialogTitle>
          <DialogDescription>
            Record a payment or charge for {roomNumber ? `Room ${roomNumber}` : 'this booking'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (₦)</Label>
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

          <div className="space-y-2">
            <Label htmlFor="method">Payment Method</Label>
            <Select
              value={selectedMethod}
              onValueChange={(value) => setValue('method', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="pos">POS</SelectItem>
                <SelectItem value="transfer">Bank Transfer</SelectItem>
                <SelectItem value="online">Online Payment</SelectItem>
              </SelectContent>
            </Select>
            {errors.method && (
              <p className="text-sm text-destructive">{errors.method.message}</p>
            )}
          </div>

          {selectedMethod && selectedMethod !== 'cash' && (
            <div className="space-y-2">
              <Label htmlFor="provider">Provider</Label>
              <Select
                value={watch('provider_id')}
                onValueChange={(value) => setValue('provider_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {activeProviders
                    .filter(p => p.type === selectedMethod || selectedMethod === 'online')
                    .map(provider => (
                      <SelectItem key={provider.id} value={provider.id}>
                        {provider.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="wallet">Destination Wallet (Optional)</Label>
            <Select
              value={watch('wallet_id')}
              onValueChange={(value) => setValue('wallet_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select wallet" />
              </SelectTrigger>
              <SelectContent>
                {wallets.map(wallet => (
                  <SelectItem key={wallet.id} value={wallet.id}>
                    {wallet.name || wallet.department} - ₦{wallet.balance.toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes..."
              {...register('notes')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Charge
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
