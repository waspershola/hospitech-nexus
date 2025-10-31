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
  const { mutate: applyWalletCredit } = useApplyWalletCredit();
  const [showWalletDialog, setShowWalletDialog] = useState(false);
  const [walletChecked, setWalletChecked] = useState(false);

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

  // Auto-suggest wallet credit if enabled and available
  useEffect(() => {
    const autoApply = preferences?.auto_apply_wallet_on_booking ?? true;
    const hasBalance = wallet && wallet.balance > 0;
    
    if (autoApply && hasBalance && !walletChecked && folio) {
      setShowWalletDialog(true);
      setWalletChecked(true);
    }
  }, [wallet, preferences, walletChecked, folio]);

  const handleApplyWallet = (amount: number) => {
    if (amount > 0) {
      applyWalletCredit({
        guestId,
        bookingId,
        amountToApply: amount,
      }, {
        onSuccess: () => {
          setShowWalletDialog(false);
        },
      });
    } else {
      setShowWalletDialog(false);
    }
  };

  if (folioLoading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-6 w-48 mb-4" />
        <Skeleton className="h-32 w-full" />
      </Card>
    );
  }

  // Use actual folio balance if available, otherwise use totalAmount
  const balanceDue = folio?.balance ?? totalAmount;

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
        <h3 className="text-lg font-semibold mb-4">Collect Payment</h3>
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
