import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFinanceProviders } from '@/hooks/useFinanceProviders';
import { useFinanceLocations } from '@/hooks/useFinanceLocations';
import { useWallets } from '@/hooks/useWallets';
import { useRecordPayment } from '@/hooks/useRecordPayment';
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
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const paymentSchema = z.object({
  amount: z.string().min(1, 'Amount is required'),
  expected_amount: z.string().optional(),
  method: z.string().min(1, 'Payment method is required'),
  provider_id: z.string().optional(),
  location_id: z.string().optional(),
  wallet_id: z.string().optional(),
  department: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface PaymentFormProps {
  guestId?: string;
  organizationId?: string;
  bookingId?: string;
  prefilledAmount?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function PaymentForm({
  guestId,
  organizationId,
  bookingId,
  prefilledAmount,
  onSuccess,
  onCancel,
}: PaymentFormProps) {
  const [validationError, setValidationError] = useState<string | null>(null);
  const { providers = [] } = useFinanceProviders();
  const { locations = [] } = useFinanceLocations();
  const { wallets = [] } = useWallets();
  const { mutate: recordPayment, isPending } = useRecordPayment();

  const activeProviders = providers.filter(p => p.status === 'active');
  const activeLocations = locations.filter(l => l.status === 'active');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: prefilledAmount?.toString() || '',
      method: '',
      notes: '',
    },
  });

  const selectedMethod = watch('method');
  const selectedLocationId = watch('location_id');
  const amount = watch('amount');
  const expectedAmount = watch('expected_amount');

  // Auto-select provider based on location
  useEffect(() => {
    if (selectedLocationId) {
      const location = locations.find(l => l.id === selectedLocationId);
      if (location?.provider_id) {
        setValue('provider_id', location.provider_id);
        setValue('department', location.department || '');
      }
    }
  }, [selectedLocationId, locations, setValue]);

  // Determine payment type
  const getPaymentType = (): 'partial' | 'full' | 'overpayment' | undefined => {
    if (!amount || !expectedAmount) return undefined;
    const amountNum = parseFloat(amount);
    const expectedNum = parseFloat(expectedAmount);
    if (amountNum < expectedNum) return 'partial';
    if (amountNum > expectedNum) return 'overpayment';
    return 'full';
  };

  const onSubmit = (data: PaymentFormData) => {
    setValidationError(null);

    const transactionRef = `PAY-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
    const paymentType = getPaymentType();

    recordPayment(
      {
        transaction_ref: transactionRef,
        guest_id: guestId,
        organization_id: organizationId,
        booking_id: bookingId,
        amount: parseFloat(data.amount),
        expected_amount: data.expected_amount ? parseFloat(data.expected_amount) : undefined,
        payment_type: paymentType,
        method: data.method,
        provider_id: data.provider_id,
        location_id: data.location_id,
        department: data.department,
        wallet_id: data.wallet_id,
        metadata: {
          notes: data.notes,
        },
      },
      {
        onSuccess: () => {
          onSuccess?.();
        },
        onError: (error: Error) => {
          setValidationError(error.message);
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {validationError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Amount *</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            placeholder="0.00"
            {...register('amount')}
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
            placeholder="0.00"
            {...register('expected_amount')}
          />
        </div>
      </div>

      {expectedAmount && amount && getPaymentType() && (
        <Alert>
          <AlertDescription>
            Payment Type: <strong className="capitalize">{getPaymentType()}</strong>
            {getPaymentType() === 'partial' && ' - Balance will remain due'}
            {getPaymentType() === 'overpayment' && ' - Excess will be credited to wallet'}
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="method">Payment Method *</Label>
        <Select onValueChange={(value) => setValue('method', value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select payment method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pos">POS</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="transfer">Bank Transfer</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
          </SelectContent>
        </Select>
        {errors.method && (
          <p className="text-sm text-destructive">{errors.method.message}</p>
        )}
      </div>

      {activeLocations.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="location_id">Payment Location</Label>
          <Select onValueChange={(value) => setValue('location_id', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select location" />
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

      {selectedMethod && activeProviders.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="provider_id">Provider</Label>
          <Select 
            onValueChange={(value) => setValue('provider_id', value)}
            value={watch('provider_id')}
            disabled={!!selectedLocationId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select provider" />
            </SelectTrigger>
            <SelectContent>
              {activeProviders
                .filter(p => p.type === selectedMethod || selectedMethod === 'cash')
                .map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    {provider.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {selectedLocationId && (
            <p className="text-xs text-muted-foreground">
              Provider auto-selected from location
            </p>
          )}
        </div>
      )}

      {wallets.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="wallet_id">Destination Wallet (Optional)</Label>
          <Select onValueChange={(value) => setValue('wallet_id', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select wallet" />
            </SelectTrigger>
            <SelectContent>
              {wallets.map((wallet) => (
                <SelectItem key={wallet.id} value={wallet.id}>
                  {wallet.name || `${wallet.wallet_type} wallet`} - Balance: {wallet.currency} {Number(wallet.balance).toFixed(2)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Textarea
          id="notes"
          placeholder="Add any additional notes..."
          {...register('notes')}
          rows={3}
        />
      </div>

      <div className="flex gap-2 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isPending} className="flex-1">
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Record Payment
        </Button>
      </div>
    </form>
  );
}
