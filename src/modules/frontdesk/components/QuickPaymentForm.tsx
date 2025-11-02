import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Printer } from 'lucide-react';
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
  const [shouldPrintReceipt, setShouldPrintReceipt] = useState(false);
  
  // Fetch actual booking balance
  const { data: folio, isLoading } = useBookingFolio(bookingId);
  const { print: printReceiptFn } = usePrintReceipt();
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
    // Print receipt if user toggled it on
    const defaultSettings = receiptSettings?.[0];
    if (shouldPrintReceipt && defaultSettings && paymentId) {
      printReceiptFn({
        receiptType: 'payment',
        paymentId,
        bookingId,
        settingsId: defaultSettings.id,
      }, defaultSettings);
    }
    
    onSuccess();
  };
  
  return (
    <div className="p-4 space-y-4">
      {/* Print Receipt Toggle */}
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <Printer className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="payment-print-toggle" className="cursor-pointer">
            Print Receipt After Payment
          </Label>
        </div>
        <Switch
          id="payment-print-toggle"
          checked={shouldPrintReceipt}
          onCheckedChange={setShouldPrintReceipt}
        />
      </div>

      <PaymentForm
        bookingId={bookingId}
        guestId={guestId}
        expectedAmount={balanceDue}
        isBookingPayment={true}
        dashboardContext="front_desk"
        onSuccess={handlePaymentSuccess}
        onCancel={onCancel}
      />
    </div>
  );
}
