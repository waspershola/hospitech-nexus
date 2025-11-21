import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFinanceProviders } from '@/hooks/useFinanceProviders';
import { useFinanceLocations } from '@/hooks/useFinanceLocations';
import { useWallets } from '@/hooks/useWallets';
import { useRecordPayment } from '@/hooks/useRecordPayment';
import { useFinancials } from '@/hooks/useFinancials';
import { useDashboardDefaults } from '@/hooks/useDashboardDefaults';
import { useApplyWalletCredit } from '@/hooks/useApplyWalletCredit';
import { usePaymentPreferences } from '@/hooks/usePaymentPreferences';
import { useQueryClient } from '@tanstack/react-query';
import { calculateBookingTotal } from '@/lib/finance/tax';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { GuestWalletBalanceCard } from '@/components/shared/GuestWalletBalanceCard';
import { WalletCreditApplyDialog } from '@/modules/bookings/components/WalletCreditApplyDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
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
  expectedAmount?: number;
  isBookingPayment?: boolean;
  dashboardContext?: string;
  onSuccess?: (paymentId?: string) => void;
  onCancel?: () => void;
}

export function PaymentForm({
  guestId,
  organizationId,
  bookingId,
  prefilledAmount,
  expectedAmount,
  isBookingPayment = false,
  dashboardContext = 'front_desk',
  onSuccess,
  onCancel,
}: PaymentFormProps) {
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showOverpaymentDialog, setShowOverpaymentDialog] = useState(false);
  const [overpaymentAction, setOverpaymentAction] = useState<'wallet' | 'refund'>('wallet');
  const [showManagerApproval, setShowManagerApproval] = useState(false);
  const [managerApprovalType, setManagerApprovalType] = useState<'overpayment' | 'underpayment'>('overpayment');
  const [requiresApprovalAmount, setRequiresApprovalAmount] = useState(0);
  const [showWalletApplyDialog, setShowWalletApplyDialog] = useState(false);
  const [walletCreditApplied, setWalletCreditApplied] = useState(0);
  const [autoApplyAttempted, setAutoApplyAttempted] = useState(false);
  const [sendSMS, setSendSMS] = useState(false);
  const [guestPhone, setGuestPhone] = useState<string | null>(null);
  
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();
  const { providers = [], isLoading: providersLoading } = useFinanceProviders();
  const { locations = [] } = useFinanceLocations();
  const { wallets = [] } = useWallets();
  const { data: financials } = useFinancials();
  const { mutate: recordPayment, isPending } = useRecordPayment();
  const { mutate: applyWalletCredit, isPending: applyingWallet } = useApplyWalletCredit();
  const { preferences } = usePaymentPreferences();
  const { getDefaultLocation } = useDashboardDefaults();

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
      amount: '',
      expected_amount: expectedAmount?.toString() || prefilledAmount?.toString() || '',
      provider_id: '',
      notes: '',
    },
  });

  const selectedLocationId = watch('location_id');
  const selectedProviderId = watch('provider_id');
  const amount = watch('amount');
  const expectedAmountField = watch('expected_amount');
  
  // Check if selected provider is credit_deferred
  const selectedProvider = activeProviders.find(p => p.id === selectedProviderId);
  
  // Calculate provider fee for display
  const providerFee = selectedProvider?.fee_percent || 0;
  const feeBearer = selectedProvider?.fee_bearer || 'property';
  const amountNum = amount ? parseFloat(amount) : 0;
  const calculatedFee = (amountNum * providerFee) / 100;

  // If guest pays fee, the actual charge is amount + fee
  const actualChargeToGuest = feeBearer === 'guest' 
    ? amountNum + calculatedFee 
    : amountNum;

  // If property pays fee, the net received is amount - fee
  const netReceivedByProperty = feeBearer === 'property'
    ? amountNum - calculatedFee
    : amountNum;
  
  // Only calculate tax breakdown for ad-hoc payments, NOT for booking payments
  const taxBreakdown = !isBookingPayment && amount && financials 
    ? calculateBookingTotal(parseFloat(amount), financials) 
    : null;

  // Auto-select default location on mount
  useEffect(() => {
    if (!watch('location_id')) {
      const defaultLoc = getDefaultLocation(dashboardContext);
      if (defaultLoc) {
        setValue('location_id', defaultLoc);
      }
    }
  }, [getDefaultLocation, setValue, watch, dashboardContext]);

  // Fetch guest wallet and phone for auto-apply
  const { data: guestWallet } = useQuery({
    queryKey: ['guest-wallet-balance', guestId, tenantId],
    queryFn: async () => {
      if (!tenantId || !guestId) return null;
      
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('owner_id', guestId)
        .eq('wallet_type', 'guest')
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId && !!guestId && isBookingPayment,
  });

  // Fetch guest phone for SMS
  useEffect(() => {
    if (!guestId || !tenantId) return;
    
    const fetchGuestPhone = async () => {
      const { data } = await supabase
        .from('guests')
        .select('phone')
        .eq('id', guestId)
        .single();
      
      setGuestPhone(data?.phone || null);
    };
    
    fetchGuestPhone();
  }, [guestId, tenantId]);

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

  // Auto-apply wallet credit if enabled in preferences
  useEffect(() => {
    if (!guestId || !bookingId || !expectedAmount) return;
    if (!preferences?.auto_apply_wallet_on_booking) return;
    if (walletCreditApplied > 0 || autoApplyAttempted) return;
    
    const walletBalance = guestWallet?.balance ? Number(guestWallet.balance) : 0;
    if (walletBalance <= 0) {
      setAutoApplyAttempted(true);
      return;
    }
    
    const amountToApply = Math.min(walletBalance, expectedAmount);
    
    // Auto-apply wallet credit
    setAutoApplyAttempted(true);
    applyWalletCredit(
      { guestId, bookingId, amountToApply },
      {
        onSuccess: (data) => {
          setWalletCreditApplied(amountToApply);
          const newExpectedAmount = Math.max(0, expectedAmount - amountToApply);
          setValue('expected_amount', newExpectedAmount.toString());
          // Invalidate wallet queries to refresh balance
          queryClient.invalidateQueries({ queryKey: ['guest-wallet-balance', guestId, tenantId] });
          queryClient.invalidateQueries({ queryKey: ['wallets'] });
        },
        onError: () => {
          // Silent fail for auto-apply
        }
      }
    );
  }, [guestId, bookingId, expectedAmount, preferences, guestWallet, walletCreditApplied, autoApplyAttempted, applyWalletCredit, setValue]);

  // Determine payment type based on BALANCE DUE vs AMOUNT PAYING
  const getPaymentType = (): 'partial' | 'full' | 'overpayment' | undefined => {
    if (!amount || !expectedAmountField) return undefined;
    const amountPaying = parseFloat(amount);
    const balanceDue = parseFloat(expectedAmountField);
    
    if (amountPaying < balanceDue - 0.01) return 'partial';      // Underpayment
    if (amountPaying > balanceDue + 0.01) return 'overpayment';  // Overpayment
    return 'full';                                                // Exact payment
  };

  // Calculate difference amounts for validation
  const paymentDifference = amount && expectedAmountField 
    ? parseFloat(amount) - parseFloat(expectedAmountField)
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
      // Check if requires manager approval for LARGE OVERPAYMENT
      if (paymentDifference > 50000) {
        setManagerApprovalType('overpayment');
        setRequiresApprovalAmount(paymentDifference);
        setShowManagerApproval(true);
        return;
      }
      
      setShowOverpaymentDialog(true);
      return; // Don't submit yet
    }
    
    // Handle underpayment - check if requires manager approval for LARGE BALANCE DUE
    if (paymentType === 'partial') {
      const balanceDue = parseFloat(data.expected_amount || '0') - parseFloat(data.amount);
      if (balanceDue > 50000) {
        setManagerApprovalType('underpayment');
        setRequiresApprovalAmount(balanceDue); // The REMAINING balance
        setShowManagerApproval(true);
        return;
      }
    }

    // Submit payment
    submitPayment(data, selectedProvider, transactionRef, paymentType);
  };
  
  const submitPayment = (
    data: PaymentFormData, 
    selectedProvider: any, 
    transactionRef: string, 
    paymentType: any,
    approvalToken?: string
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
        approval_token: approvalToken,
        metadata: {
          notes: data.notes,
          provider_name: selectedProvider.name,
          provider_fee: selectedProvider.fee_percent,
        },
      },
      {
        onSuccess: async (paymentData) => {
          setShowOverpaymentDialog(false);
          setShowManagerApproval(false);
          
          // PHASE 2: Send SMS receipt if enabled
          if (sendSMS && guestPhone && paymentData?.payment) {
            try {
              const { data: tenant } = await supabase
                .from('tenants')
                .select('name')
                .eq('id', tenantId)
                .single();

              const hotelName = tenant?.name || 'Hotel';
              const amount = parseFloat(data.amount).toLocaleString();
              const method = selectedProvider.name;

              const message = `Payment received: ₦${amount} via ${method}. Ref: ${transactionRef}. Thank you! - ${hotelName}`;

              await supabase.functions.invoke('send-sms', {
                body: {
                  tenant_id: tenantId,
                  to: guestPhone,
                  message,
                  event_key: 'payment_received',
                  booking_id: bookingId,
                  guest_id: guestId,
                },
              });
            } catch (smsError) {
              console.error('SMS send failed:', smsError);
              // Don't block success flow
            }
          }
          
          onSuccess?.(paymentData?.payment?.id);
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

      {/* Guest Wallet Balance Display */}
      {guestId && (
        <GuestWalletBalanceCard 
          guestId={guestId} 
          onApplyWallet={() => setShowWalletApplyDialog(true)}
        />
      )}

      {/* Wallet Apply Dialog */}
      {guestId && bookingId && (
        <WalletCreditApplyDialog
          open={showWalletApplyDialog}
          onOpenChange={setShowWalletApplyDialog}
          guestId={guestId}
          bookingTotal={expectedAmount || 0}
          onApply={(appliedAmount) => {
            if (!bookingId || !guestId || appliedAmount <= 0) {
              setShowWalletApplyDialog(false);
              return;
            }
            
            // Actually apply wallet credit via edge function
            applyWalletCredit(
              { guestId, bookingId, amountToApply: appliedAmount },
              {
                onSuccess: (data) => {
                  setWalletCreditApplied(walletCreditApplied + appliedAmount);
                  // Now reduce the expected amount
                  if (expectedAmount) {
                    const newExpectedAmount = Math.max(0, expectedAmount - appliedAmount);
                    setValue('expected_amount', newExpectedAmount.toString());
                  }
                  // Invalidate wallet queries to refresh balance
                  queryClient.invalidateQueries({ queryKey: ['guest-wallet-balance', guestId, tenantId] });
                  queryClient.invalidateQueries({ queryKey: ['wallets'] });
                  setShowWalletApplyDialog(false);
                },
                onError: () => {
                  setShowWalletApplyDialog(false);
                }
              }
            );
          }}
        />
      )}

      {/* Wallet Credit Applied Alert */}
      {walletCreditApplied > 0 && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
          <Wallet className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            <strong>Wallet Credit Applied:</strong> ₦{walletCreditApplied.toLocaleString()}
            {preferences?.auto_apply_wallet_on_booking && ' (Auto-applied)'}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Amount Paying Now *</Label>
          <div className="flex gap-2">
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="Enter amount paying..."
              {...register('amount')}
              className="flex-1"
            />
            {expectedAmountField && parseFloat(expectedAmountField) > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setValue('amount', expectedAmountField)}
                className="whitespace-nowrap"
                title="Use Balance Due"
              >
                Use Balance
              </Button>
            )}
          </div>
          {errors.amount && (
            <p className="text-sm text-destructive">{errors.amount.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="expected_amount">
            Balance Due {isBookingPayment && '(from booking)'}
          </Label>
          <Input
            id="expected_amount"
            type="number"
            step="0.01"
            placeholder="0.00"
            {...register('expected_amount')}
            disabled={isBookingPayment}
          />
          <p className="text-xs text-muted-foreground">
            {isBookingPayment 
              ? 'Calculated from booking folio' 
              : 'Leave blank if no specific amount expected'}
          </p>
        </div>
      </div>

      {expectedAmountField && amount && getPaymentType() && (
        <Alert variant={isLargeOverpayment ? 'destructive' : 'default'}>
          <AlertDescription>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Payment Type:</span>
                <span className={`font-semibold px-2 py-1 rounded text-xs ${
                  getPaymentType() === 'full' ? 'bg-green-100 text-green-700' : 
                  getPaymentType() === 'partial' ? 'bg-yellow-100 text-yellow-700' : 
                  'bg-blue-100 text-blue-700'
                }`}>
                  {getPaymentType()?.toUpperCase()}
                </span>
              </div>
              
              {getPaymentType() === 'partial' && (
                <div className="mt-2 text-sm space-y-1 bg-muted/30 p-3 rounded">
                  <div className="flex justify-between">
                    <span>Amount Paying:</span>
                    <strong>₦{parseFloat(amount).toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Balance Due:</span>
                    <span>₦{parseFloat(expectedAmountField).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-destructive font-semibold pt-1 border-t">
                    <span>Remaining Balance:</span>
                    <span>₦{Math.abs(paymentDifference).toLocaleString()}</span>
                  </div>
                  <p className="text-xs mt-2 text-muted-foreground">
                    ⚠️ Remaining balance will be tracked as receivable
                  </p>
                </div>
              )}
              
              {getPaymentType() === 'overpayment' && (
                <div className="mt-2 text-sm space-y-1 bg-muted/30 p-3 rounded">
                  <div className="flex justify-between">
                    <span>Amount Paying:</span>
                    <strong>₦{parseFloat(amount).toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Balance Due:</span>
                    <span>₦{parseFloat(expectedAmountField).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-primary font-semibold pt-1 border-t">
                    <span>Excess Amount:</span>
                    <span>₦{paymentDifference.toLocaleString()}</span>
                  </div>
                  <p className="text-xs mt-2 text-muted-foreground">
                    ✓ Excess will be credited to guest wallet for future use
                  </p>
                  {isLargeOverpayment && (
                    <p className="text-xs font-semibold text-destructive mt-2">
                      ⚠️ Large overpayment detected (&gt;₦50,000). Manager approval required.
                    </p>
                  )}
                </div>
              )}
              
              {getPaymentType() === 'full' && (
                <p className="text-sm text-green-600 mt-2 font-medium">
                  ✓ Full payment - booking will be marked as paid
                </p>
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

      {selectedProvider && selectedProvider.fee_percent > 0 && amount && (
        <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
          <AlertDescription>
            <div className="space-y-2 text-sm">
              <div className="font-semibold flex items-center gap-2">
                <span>💳</span>
                <span>Provider Fee Breakdown</span>
              </div>
              
              <div className="bg-white dark:bg-slate-900 rounded p-3 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount Entered:</span>
                  <span className="font-medium">₦{amountNum.toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Provider Fee ({selectedProvider.fee_percent}%):
                  </span>
                  <span className="font-medium text-orange-600">
                    ₦{calculatedFee.toFixed(2)}
                  </span>
                </div>
                
                <div className="border-t pt-1.5 mt-1.5">
                  {feeBearer === 'guest' ? (
                    <>
                      <div className="flex justify-between text-destructive font-semibold">
                        <span>Guest Will Pay:</span>
                        <span>₦{actualChargeToGuest.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-green-600 text-xs mt-1">
                        <span>Property Receives:</span>
                        <span>₦{amountNum.toLocaleString()} (full amount)</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between text-green-600 font-semibold">
                        <span>Property Receives:</span>
                        <span>₦{netReceivedByProperty.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground text-xs mt-1">
                        <span>Guest Pays:</span>
                        <span>₦{amountNum.toLocaleString()} (no extra fee)</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground italic">
                {feeBearer === 'guest' 
                  ? '⚠️ Fee will be added to guest\'s total charge' 
                  : '💡 Fee is deducted from property\'s received amount'}
              </p>
            </div>
          </AlertDescription>
        </Alert>
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
                  {provider.fee_percent > 0 && (
                    <span className="text-xs">
                      {` (${provider.fee_percent}% fee - ${provider.fee_bearer === 'guest' ? 'Guest pays' : 'Property pays'})`}
                    </span>
                  )}
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

      {/* Only show overpayment destination if overpayment detected */}
      {wallets.length > 0 && getPaymentType() === 'overpayment' && (
        <div className="space-y-2">
          <Label htmlFor="wallet_id">Overpayment Destination (Optional)</Label>
          <Select onValueChange={(value) => setValue('wallet_id', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Auto (Guest Wallet)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto (Guest Wallet)</SelectItem>
              {wallets.map((wallet) => (
                <SelectItem key={wallet.id} value={wallet.id}>
                  {wallet.name || `${wallet.wallet_type} wallet`} - Balance: {wallet.currency} {Number(wallet.balance).toFixed(2)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Where to credit the excess payment amount
          </p>
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

      {/* SMS Receipt Toggle */}
      {guestPhone && (
        <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
          <div className="flex-1">
            <Label htmlFor="sendSMS" className="cursor-pointer">Send SMS Receipt</Label>
            <p className="text-sm text-muted-foreground">
              Send payment confirmation to {guestPhone}
            </p>
          </div>
          <Switch id="sendSMS" checked={sendSMS} onCheckedChange={setSendSMS} />
        </div>
      )}

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
                submitPayment(data, selectedProvider, transactionRef, getPaymentType());
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
        actionReference={bookingId}
        onApprove={(reason, approvalToken) => {
          console.log('[MANAGER-APPROVAL-V1] Manager approved with reason:', reason, 'token:', approvalToken);
          const data = watch();
          const selectedProvider = activeProviders.find(p => p.id === data.provider_id);
          if (selectedProvider) {
            const transactionRef = `PAY-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
            submitPayment(data, selectedProvider, transactionRef, getPaymentType(), approvalToken);
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
