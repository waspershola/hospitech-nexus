import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useInitiatePlatformPayment } from '@/hooks/useInitiatePlatformPayment';
import { Loader2, CreditCard, AlertCircle } from 'lucide-react';

interface PayPlatformFeesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId?: string;
  outstandingAmount: number;
}

export function PayPlatformFeesDialog({
  open,
  onOpenChange,
  tenantId,
  outstandingAmount,
}: PayPlatformFeesDialogProps) {
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>('');
  const { mutate: initiatePayment, isPending: isInitiating } = useInitiatePlatformPayment();

  // Fetch available payment methods
  const { data: paymentMethods, isLoading: isLoadingMethods } = useQuery({
    queryKey: ['platform-payment-methods'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_payment_providers')
        .select('id, provider_name, provider_type')
        .eq('is_active', true)
        .order('provider_name');

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const handleProceedToPayment = () => {
    if (!tenantId || !selectedPaymentMethodId) return;

    initiatePayment(
      {
        tenant_id: tenantId,
        payment_method_id: selectedPaymentMethodId,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setSelectedPaymentMethodId('');
        },
      }
    );
  };

  const selectedMethod = paymentMethods?.find(m => m.id === selectedPaymentMethodId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Pay Platform Fees
          </DialogTitle>
          <DialogDescription>
            Complete payment for your outstanding platform fees
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Amount Summary */}
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Amount Due</span>
              <span className="text-2xl font-bold text-primary">
                ₦{outstandingAmount.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-2">
            <Label htmlFor="payment-method">Payment Method</Label>
            {isLoadingMethods ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : paymentMethods && paymentMethods.length > 0 ? (
              <>
                <Select
                  value={selectedPaymentMethodId}
                  onValueChange={setSelectedPaymentMethodId}
                >
                  <SelectTrigger id="payment-method">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method.id} value={method.id}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{method.provider_name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({method.provider_type})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedMethod && (
                  <p className="text-xs text-muted-foreground">
                    You will be redirected to {selectedMethod.provider_name} to complete your payment securely.
                  </p>
                )}
              </>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No payment methods available. Please contact support.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Info Alert */}
          <Alert>
            <AlertDescription className="text-xs">
              Your payment will be processed securely through our payment gateway. 
              Once completed, your fee status will be updated automatically.
            </AlertDescription>
          </Alert>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isInitiating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleProceedToPayment}
            disabled={!selectedPaymentMethodId || isInitiating}
          >
            {isInitiating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4 mr-2" />
                Proceed to Payment
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
