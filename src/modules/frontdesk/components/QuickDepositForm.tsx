import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Printer } from 'lucide-react';
import { PaymentForm } from '@/modules/payments/PaymentForm';
import { usePrintReceipt } from '@/hooks/usePrintReceipt';
import { useReceiptSettings } from '@/hooks/useReceiptSettings';

interface QuickDepositFormProps {
  bookingId: string;
  guestId?: string;
  expectedAmount?: number;
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * QuickDepositForm - Wrapper around unified PaymentForm for pre-check-in deposits
 * GROUP-BOOKING-DEPOSIT-FIX-V2: Phase 2 - Unified deposit UI matching QuickPaymentForm
 */
export function QuickDepositForm({ 
  bookingId, 
  guestId,
  expectedAmount, 
  onSuccess, 
  onCancel 
}: QuickDepositFormProps) {
  const [shouldPrintReceipt, setShouldPrintReceipt] = useState(false);
  const { print: printReceiptFn } = usePrintReceipt();
  const { settings: receiptSettings } = useReceiptSettings();
  
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
    <div className="space-y-4">
      {/* Print Receipt Toggle */}
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <Printer className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="deposit-print-toggle" className="cursor-pointer">
            Print Receipt After Deposit
          </Label>
        </div>
        <Switch
          id="deposit-print-toggle"
          checked={shouldPrintReceipt}
          onCheckedChange={setShouldPrintReceipt}
        />
      </div>

      <PaymentForm
        bookingId={bookingId}
        guestId={guestId || ''}
        expectedAmount={expectedAmount || 0}
        isBookingPayment={true}
        dashboardContext="front_desk"
        onSuccess={handlePaymentSuccess}
        onCancel={onCancel}
      />
    </div>
  );
}
