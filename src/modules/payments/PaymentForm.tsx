import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFinanceProviders } from '@/hooks/useFinanceProviders';
import { useFinanceLocations } from '@/hooks/useFinanceLocations';
import { useWallets } from '@/hooks/useWallets';
import { useRecordPayment } from '@/hooks/useRecordPayment';
import { useFinancials } from '@/hooks/useFinancials';
import { calculateBookingTotal } from '@/lib/finance/tax';
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
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertCircle, Loader2, Wallet, RefreshCcw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ManagerApprovalModal } from './ManagerApprovalModal';

const paymentSchema = z.object({
  amount: z.string().min(1, 'Amount is required'),
  expected_amount: z.string().optional(),
  method: z.string().optional(),
  provider_id: z.string().min(1, 'Payment provider is required'),
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
  const [showOverpaymentDialog, setShowOverpaymentDialog] = useState(false);
  const [overpaymentAction, setOverpaymentAction] = useState<'wallet' | 'refund'>('wallet');
  const [showManagerApproval, setShowManagerApproval] = useState(false);
  const [managerApprovalType, setManagerApprovalType] = useState<'overpayment' | 'underpayment'>('overpayment');
  const [requiresApprovalAmount, setRequiresApprovalAmount] = useState(0);
  
  const { providers = [], isLoading: providersLoading } = useFinanceProviders();
  const { locations = [] } = useFinanceLocations();
  const { wallets = [] } = useWallets();
  const { data: financials } = useFinancials();
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
      provider_id: '',
      notes: '',
    },
  });

  const selectedLocationId = watch('location_id');
  const selectedProviderId = watch('provider_id');
  const amount = watch('amount');
  const expectedAmount = watch('expected_amount');
  
  // Check if selected provider is credit_deferred
  const selectedProvider = activeProviders.find(p => p.id === selectedProviderId);
  // Calculate tax breakdown for standalone amount (not a booking)
  const taxBreakdown = amount && financials ? calculateBookingTotal(parseFloat(amount), financials) : null;

  // Auto-select provider based on location
  useEffect(() => {
    if (selectedLocationId) {
      const location = locations.find(l => l.id === selectedLocationId);
      if (location?.provider_id) {
        setValue('provider_id', location.provider_id);
        const provider = activeProviders.find(p => p.id === location.provider_id);
        if (provider) {
          setValue('method', provider.type);
        }
        setValue('department', location.department || '');
      }
    }
  }, [selectedLocationId, locations, activeProviders, setValue]);

  // Determine payment type
  const getPaymentType = (): 'partial' | 'full' | 'overpayment' | undefined => {
    if (!amount || !expectedAmount) return undefined;
    const amountNum = parseFloat(amount);
    const expectedNum = parseFloat(expectedAmount);
    if (amountNum < expectedNum - 0.01) return 'partial';
    if (amountNum > expectedNum + 0.01) return 'overpayment';
    return 'full';
  };

  // Calculate difference amounts for validation
  const paymentDifference = amount && expectedAmount 
    ? parseFloat(amount) - parseFloat(expectedAmount)
    : 0;
  
  const isLargeOverpayment = paymentDifference > 50000;

  const onSubmit = (data: PaymentFormData) => {
    setValidationError(null);

    const transactionRef = `PAY-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
    const paymentType = getPaymentType();

    // Find selected provider
    const selectedProvider = activeProviders.find(p => p.id === data.provider_id);
    
    if (!selectedProvider) {
      setValidationError('Please select a valid payment provider');
      return;
    }

    // Handle overpayment - show dialog for user choice
    if (paymentType === 'overpayment' && paymentDifference > 0 && !showOverpaymentDialog) {
      // Check if requires manager approval
      if (paymentDifference > 50000) {
        setManagerApprovalType('overpayment');
        setRequiresApprovalAmount(paymentDifference);
        setShowManagerApproval(true);
        return;
      }
      
      setShowOverpaymentDialog(true);
      return; // Don't submit yet
    }
    
    // Handle underpayment - check if requires manager approval
    if (paymentType === 'partial' && Math.abs(paymentDifference) > 50000) {
      setManagerApprovalType('underpayment');
      setRequiresApprovalAmount(Math.abs(paymentDifference));
      setShowManagerApproval(true);
      return;
    }

    // Submit payment
    submitPayment(data, selectedProvider, transactionRef, paymentType, false);
  };
  
  const submitPayment = (
    data: PaymentFormData, 
    selectedProvider: any, 
    transactionRef: string, 
    paymentType: any,
    forceApprove: boolean
  ) => {
    recordPayment(
      {
        transaction_ref: transactionRef,
        guest_id: guestId,
        organization_id: organizationId,
        booking_id: bookingId,
        amount: parseFloat(data.amount),
        expected_amount: data.expected_amount ? parseFloat(data.expected_amount) : undefined,
        payment_type: paymentType,
        method: selectedProvider.type,
        provider_id: data.provider_id,
        location_id: data.location_id,
        department: data.department,
        wallet_id: data.wallet_id,
        overpayment_action: paymentType === 'overpayment' ? overpaymentAction : undefined,
        force_approve: forceApprove,
        metadata: {
          notes: data.notes,
          provider_name: selectedProvider.name,
          provider_fee: selectedProvider.fee_percent,
        },
      },
      {
        onSuccess: () => {
          setShowOverpaymentDialog(false);
          setShowManagerApproval(false);
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
        <Alert variant={isLargeOverpayment ? 'destructive' : 'default'}>
          <AlertDescription>
            <div className="space-y-1">
              <div>
                Payment Type: <strong className="capitalize">{getPaymentType()}</strong>
              </div>
              {getPaymentType() === 'partial' && (
                <p className="text-sm">
                  Balance due: <strong>₦{Math.abs(paymentDifference).toLocaleString()}</strong> will be tracked as receivable
                </p>
              )}
              {getPaymentType() === 'overpayment' && (
                <>
                  <p className="text-sm">
                    Excess amount: <strong>₦{paymentDifference.toLocaleString()}</strong> will be credited to guest wallet
                  </p>
                  {isLargeOverpayment && (
                    <p className="text-sm font-semibold mt-2">
                      ⚠️ Large overpayment detected. Please confirm with guest before proceeding.
                    </p>
                  )}
                </>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {taxBreakdown && (taxBreakdown.vatAmount > 0 || taxBreakdown.serviceAmount > 0) && (
        <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm">
          <p className="font-medium text-muted-foreground">Tax Breakdown</p>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Base Amount</span>
              <span className="font-medium">₦{taxBreakdown.baseAmount.toFixed(2)}</span>
            </div>
            {taxBreakdown.vatAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">VAT</span>
                <span className="font-medium">₦{taxBreakdown.vatAmount.toFixed(2)}</span>
              </div>
            )}
            {taxBreakdown.serviceAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service Charge</span>
                <span className="font-medium">₦{taxBreakdown.serviceAmount.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="provider_id">Payment Method *</Label>
        <Select 
          onValueChange={(value) => {
            setValue('provider_id', value);
            const selectedProv = activeProviders.find(p => p.id === value);
            if (selectedProv) {
              setValue('method', selectedProv.type);
            }
          }}
          value={watch('provider_id')}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select payment method" />
          </SelectTrigger>
          <SelectContent>
            {providersLoading ? (
              <SelectItem value="loading" disabled>
                Loading providers...
              </SelectItem>
            ) : activeProviders.length === 0 ? (
              <SelectItem value="none" disabled>
                No active providers configured
              </SelectItem>
            ) : (
              activeProviders.map((provider) => (
                <SelectItem key={provider.id} value={provider.id}>
                  {provider.type === 'credit_deferred' && '🕐 '}
                  {provider.name}
                  {provider.fee_percent > 0 && ` (${provider.fee_percent}% fee)`}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        {errors.provider_id && (
          <p className="text-sm text-destructive">{errors.provider_id.message}</p>
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

      {/* Overpayment Choice Dialog */}
      <AlertDialog open={showOverpaymentDialog} onOpenChange={setShowOverpaymentDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Overpayment Detected</AlertDialogTitle>
            <AlertDialogDescription>
              Guest paid ₦{Math.abs(paymentDifference).toLocaleString()} more than expected.
              <br />How would you like to handle the excess amount?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div 
              className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                overpaymentAction === 'wallet' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
              }`}
              onClick={() => setOverpaymentAction('wallet')}
            >
              <div className="flex items-center gap-3">
                <Wallet className="h-5 w-5" />
                <div>
                  <p className="font-medium">Credit to Guest Wallet</p>
                  <p className="text-sm text-muted-foreground">Guest can use for future bookings</p>
                </div>
              </div>
            </div>
            <div 
              className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                overpaymentAction === 'refund' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
              }`}
              onClick={() => setOverpaymentAction('refund')}
            >
              <div className="flex items-center gap-3">
                <RefreshCcw className="h-5 w-5" />
                <div>
                  <p className="font-medium">Process Refund</p>
                  <p className="text-sm text-muted-foreground">Return excess to original payment method</p>
                </div>
              </div>
            </div>
          </div>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setShowOverpaymentDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              setShowOverpaymentDialog(false);
              const data = watch();
              const selectedProvider = activeProviders.find(p => p.id === data.provider_id);
              if (selectedProvider) {
                const transactionRef = `PAY-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
                submitPayment(data, selectedProvider, transactionRef, getPaymentType(), false);
              }
            }}>
              Continue Payment
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Manager Approval Modal */}
      <ManagerApprovalModal
        open={showManagerApproval}
        amount={requiresApprovalAmount}
        type={managerApprovalType}
        onApprove={(reason) => {
          console.log('Manager approved with reason:', reason);
          const data = watch();
          const selectedProvider = activeProviders.find(p => p.id === data.provider_id);
          if (selectedProvider) {
            const transactionRef = `PAY-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
            submitPayment(data, selectedProvider, transactionRef, getPaymentType(), true);
          }
        }}
        onReject={() => {
          setShowManagerApproval(false);
          setValidationError('Transaction cancelled - manager approval required');
        }}
      />
    </form>
  );
}
