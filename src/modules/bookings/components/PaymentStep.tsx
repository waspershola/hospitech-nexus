import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PaymentForm } from '@/modules/payments/PaymentForm';

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
 * - Pay Later (deferred payment)
 * - Provider selection and reconciliation
 */
export function PaymentStep({
  bookingId,
  guestId,
  totalAmount,
  onPaymentComplete,
  onSkip,
}: PaymentStepProps) {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Collect Payment</h3>
        <PaymentForm
          bookingId={bookingId}
          guestId={guestId}
          prefilledAmount={totalAmount}
          onSuccess={onPaymentComplete}
          onCancel={onSkip}
        />
      </Card>
    </div>
  );
}
