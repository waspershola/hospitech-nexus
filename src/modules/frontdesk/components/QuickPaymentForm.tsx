import { PaymentForm } from '@/modules/payments/PaymentForm';
import { useBookingFolio } from '@/hooks/useBookingFolio';
import { usePrintReceipt } from '@/hooks/usePrintReceipt';
import { useReceiptSettings } from '@/hooks/useReceiptSettings';
import { Skeleton } from '@/components/ui/skeleton';

interface QuickPaymentFormProps {
  bookingId: string;
  guestId: string;
  expectedAmount?: number;
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
  // Fetch actual booking balance
  const { data: folio, isLoading } = useBookingFolio(bookingId);
  const { print: printReceipt } = usePrintReceipt();
  const { settings: receiptSettings } = useReceiptSettings();
  
  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }
  
  // Use folio balance if available, otherwise use passed expectedAmount
  const balanceDue = folio?.balance ?? expectedAmount ?? 0;
  
  const handlePaymentSuccess = (paymentId?: string) => {
    // Auto-print receipt if enabled
    const defaultSettings = receiptSettings?.[0];
    if (defaultSettings?.auto_print_on_payment && paymentId) {
      printReceipt({
        receiptType: 'payment',
        paymentId,
        bookingId,
        settingsId: defaultSettings.id,
      }, defaultSettings);
    }
    
    onSuccess();
  };
  
  return (
    <div className="p-4">
      <PaymentForm
        bookingId={bookingId}
        guestId={guestId}
        expectedAmount={balanceDue}
        isBookingPayment={true}
        onSuccess={handlePaymentSuccess}
        onCancel={onCancel}
      />
    </div>
  );
}
