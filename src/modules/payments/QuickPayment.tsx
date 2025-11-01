import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Printer } from 'lucide-react';
import { PaymentForm } from './PaymentForm';
import { usePrintReceipt } from '@/hooks/usePrintReceipt';
import { useReceiptSettings } from '@/hooks/useReceiptSettings';

interface QuickPaymentProps {
  open: boolean;
  onClose: () => void;
  guestId?: string;
  organizationId?: string;
  bookingId?: string;
  prefilledAmount?: number;
  expectedAmount?: number;
  isBookingPayment?: boolean;
}

export function QuickPayment({
  open,
  onClose,
  guestId,
  organizationId,
  bookingId,
  prefilledAmount,
  expectedAmount,
  isBookingPayment = false,
}: QuickPaymentProps) {
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
    
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display">Record Payment</DialogTitle>
          <DialogDescription>
            {isBookingPayment 
              ? 'Record payment for booking. Amount already includes taxes.' 
              : 'Complete payment details and select the appropriate method and location.'}
          </DialogDescription>
        </DialogHeader>

        {/* Print Receipt Toggle */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Printer className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="quick-payment-print-toggle" className="cursor-pointer">
              Print Receipt After Payment
            </Label>
          </div>
          <Switch
            id="quick-payment-print-toggle"
            checked={shouldPrintReceipt}
            onCheckedChange={setShouldPrintReceipt}
          />
        </div>

        <PaymentForm
          guestId={guestId}
          organizationId={organizationId}
          bookingId={bookingId}
          prefilledAmount={prefilledAmount}
          expectedAmount={expectedAmount}
          isBookingPayment={isBookingPayment}
          onSuccess={handlePaymentSuccess}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}
