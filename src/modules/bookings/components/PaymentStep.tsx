import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PaymentForm } from '@/modules/payments/PaymentForm';
import { WalletCreditApplyDialog } from './WalletCreditApplyDialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePaymentPreferences } from '@/hooks/usePaymentPreferences';
import { useApplyWalletCredit } from '@/hooks/useApplyWalletCredit';
import { useBookingFolio } from '@/hooks/useBookingFolio';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Wallet } from 'lucide-react';

interface PaymentStepProps {
  bookingId: string;
  guestId: string;
  totalAmount: number;
  onPaymentComplete: () => void;
  onSkip: () => void;
}

/**
 * PaymentStep - Unified payment collection during booking flow
 * Uses the canonical PaymentForm with full support for:
 * - Partial payments (underpayment tracking)
 * - Overpayments (wallet credits)
 * - Provider selection and reconciliation
 * - Auto-suggest wallet credit application
 */
export function PaymentStep({
  bookingId,
  guestId,
  totalAmount,
  onPaymentComplete,
  onSkip,
}: PaymentStepProps) {
  const { tenantId } = useAuth();
  const { preferences } = usePaymentPreferences();
  const applyWalletMutation = useApplyWalletCredit();
  const [showWalletDialog, setShowWalletDialog] = useState(false);
  const [walletApplied, setWalletApplied] = useState(false);
  const [isApplyingWallet, setIsApplyingWallet] = useState(false);

  // Fetch actual booking folio to get current balance
  const { data: folio, isLoading: folioLoading } = useBookingFolio(bookingId);

  // Check for available wallet balance
  const { data: wallet } = useQuery({
    queryKey: ['guest-wallet', guestId, tenantId],
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
    enabled: !!tenantId && !!guestId,
  });

  // Use actual folio balance if available, otherwise use totalAmount
  const balanceDue = folio?.balance ?? totalAmount;

  // Auto-apply wallet credit on component mount if available and enabled
  useEffect(() => {
    const autoApplyWallet = async () => {
      const autoApply = preferences?.auto_apply_wallet_on_booking !== false;
      const hasWalletBalance = wallet && Number(wallet.balance) > 0;
      const hasBookingBalance = balanceDue > 0;
      
      if (
        autoApply &&
        hasWalletBalance &&
        hasBookingBalance &&
        !walletApplied &&
        !isApplyingWallet &&
        bookingId &&
        guestId &&
        !folioLoading
      ) {
        setIsApplyingWallet(true);
        try {
          await applyWalletMutation.mutateAsync({
            guestId,
            bookingId,
            amountToApply: balanceDue,
          });
          setWalletApplied(true);
        } catch (error) {
          console.error('Auto-apply wallet failed:', error);
        } finally {
          setIsApplyingWallet(false);
        }
      }
    };

    autoApplyWallet();
  }, [
    wallet,
    balanceDue,
    bookingId,
    guestId,
    walletApplied,
    isApplyingWallet,
    preferences,
    applyWalletMutation,
    folioLoading,
  ]);

  const handleApplyWallet = (amount: number) => {
    if (amount > 0 && bookingId && guestId) {
      applyWalletMutation.mutate(
        {
          guestId,
          bookingId,
          amountToApply: amount,
        },
        {
          onSuccess: () => {
            setShowWalletDialog(false);
          },
        }
      );
    } else {
      setShowWalletDialog(false);
    }
  };

  if (folioLoading || isApplyingWallet) {
    return (
      <Card className="p-6">
        <Skeleton className="h-6 w-48 mb-4" />
        <Skeleton className="h-32 w-full" />
        {isApplyingWallet && (
          <p className="text-sm text-muted-foreground mt-2">
            Applying wallet credit automatically...
          </p>
        )}
      </Card>
    );
  }

  const hasRemainingWallet = wallet && Number(wallet.balance) > 0;
  const canApplyMoreWallet = hasRemainingWallet && balanceDue > 0 && !isApplyingWallet;

  return (
    <div className="space-y-6">
      <WalletCreditApplyDialog
        open={showWalletDialog}
        onOpenChange={setShowWalletDialog}
        guestId={guestId}
        bookingTotal={balanceDue}
        onApply={handleApplyWallet}
      />
      
      <Card className="p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Collect Payment</h3>
          <p className="text-sm text-muted-foreground">
            {folio?.isGroupBooking 
              ? `Balance Due (from ${folio.numberOfBookings} room group)`
              : 'Balance Due (from booking)'}
          </p>
          
          {canApplyMoreWallet && (
            <Alert className="mt-4">
              <Wallet className="h-4 w-4" />
              <AlertTitle>Additional Wallet Credit Available</AlertTitle>
              <AlertDescription className="flex items-center justify-between gap-4">
                <span className="text-sm">
                  Guest has ₦{Number(wallet.balance).toLocaleString()} remaining in wallet.
                </span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowWalletDialog(true)}
                >
                  Apply More Credit
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </div>
        <PaymentForm
          bookingId={bookingId}
          guestId={guestId}
          expectedAmount={balanceDue}
          isBookingPayment={true}
          onSuccess={onPaymentComplete}
          onCancel={onSkip}
        />
      </Card>
    </div>
  );
}
