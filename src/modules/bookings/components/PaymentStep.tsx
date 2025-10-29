import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useFinanceProviders } from '@/hooks/useFinanceProviders';
import { useFinanceLocations } from '@/hooks/useFinanceLocations';
import { useWallets } from '@/hooks/useWallets';
import { useRecordPayment } from '@/hooks/useRecordPayment';

const paymentSchema = z.object({
  amount: z.number().positive('Amount must be greater than 0'),
  expected_amount: z.number().positive().optional(),
  method: z.string().min(1, 'Payment method is required'),
  location_id: z.string().optional(),
  provider_id: z.string().optional(),
  wallet_id: z.string().optional(),
});

type PaymentForm = z.infer<typeof paymentSchema>;

interface PaymentStepProps {
  bookingId: string;
  guestId: string;
  totalAmount: number;
  onPaymentComplete: () => void;
  onSkip: () => void;
}

export function PaymentStep({
  bookingId,
  guestId,
  totalAmount,
  onPaymentComplete,
  onSkip,
}: PaymentStepProps) {
  const { mutate: recordPayment, isPending } = useRecordPayment();
  const { providers } = useFinanceProviders();
  const { locations } = useFinanceLocations();
  const { wallets } = useWallets('guest');
  const [paymentType, setPaymentType] = useState<'partial' | 'full' | 'overpayment' | undefined>();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PaymentForm>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: totalAmount,
      expected_amount: totalAmount,
    },
  });

  const activeProviders = providers.filter(p => p.status === 'active');
  const activeLocations = locations.filter(l => l.status === 'active');
  const selectedMethod = watch('method');
  const selectedLocationId = watch('location_id');
  const amount = watch('amount');
  const expectedAmount = watch('expected_amount') || totalAmount;

  // Determine payment type
  const determinePaymentType = () => {
    if (!amount || !expectedAmount) return;
    if (amount < expectedAmount) {
      setPaymentType('partial');
    } else if (amount > expectedAmount) {
      setPaymentType('overpayment');
    } else {
      setPaymentType('full');
    }
  };

  const onSubmit = (data: PaymentForm) => {
    const transaction_ref = `BKG-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    recordPayment(
      {
        transaction_ref,
        booking_id: bookingId,
        guest_id: guestId,
        amount: data.amount,
        expected_amount: data.expected_amount || totalAmount,
        payment_type: paymentType,
        method: data.method,
        location_id: data.location_id,
        provider_id: data.provider_id,
        wallet_id: data.wallet_id,
        department: 'front_desk',
        metadata: {
          charge_type: 'booking_payment',
        },
      },
      {
        onSuccess: () => {
          onPaymentComplete();
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Collect Payment</h3>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount Paid *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register('amount', { 
                  valueAsNumber: true,
                  onChange: determinePaymentType,
                })}
              />
              {errors.amount && (
                <p className="text-sm text-destructive">{errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="expected_amount">Expected Amount</Label>
              <Input
                id="expected_amount"
                type="number"
                step="0.01"
                value={expectedAmount}
                disabled
              />
            </div>
          </div>

          {paymentType && (
            <Alert>
              <AlertDescription>
                <div className="flex items-center gap-2">
                  {paymentType === 'full' ? (
                    <CheckCircle className="h-4 w-4 text-success" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-warning" />
                  )}
                  <span className="font-medium capitalize">{paymentType} Payment</span>
                </div>
                {paymentType === 'partial' && (
                  <p className="text-sm mt-1">Balance of ₦{(expectedAmount - amount).toFixed(2)} will remain due</p>
                )}
                {paymentType === 'overpayment' && (
                  <p className="text-sm mt-1">Excess of ₦{(amount - expectedAmount).toFixed(2)} will be credited to wallet</p>
                )}
              </AlertDescription>
            </Alert>
          )}

          {activeLocations.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="location">Payment Location</Label>
              <Select
                value={selectedLocationId}
                onValueChange={(value) => setValue('location_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {activeLocations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name} {location.department && `(${location.department})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="method">Payment Method *</Label>
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

          {selectedMethod && selectedMethod !== 'cash' && !selectedLocationId && (
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

          {wallets.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="wallet">Guest Wallet (Optional)</Label>
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
                      {wallet.name || 'Guest Wallet'} - ₦{wallet.balance.toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onSkip} className="flex-1">
              Skip Payment
            </Button>
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Process Payment
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
