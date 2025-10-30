import { PaymentForm } from '@/modules/payments/PaymentForm';

interface QuickPaymentFormProps {
  bookingId: string;
  guestId: string;
  expectedAmount: number;
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * QuickPaymentForm - Wrapper around unified PaymentForm for front desk usage
 * This component provides a simplified interface for quick payments while leveraging
 * the full payment infrastructure including Pay Later, partial payments, and reconciliation.
 */
export function QuickPaymentForm({ 
  bookingId, 
  guestId, 
  expectedAmount, 
  onSuccess, 
  onCancel 
}: QuickPaymentFormProps) {
  return (
    <div className="p-4">
      <PaymentForm
        bookingId={bookingId}
        guestId={guestId}
        prefilledAmount={expectedAmount}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    </div>
  );
}
