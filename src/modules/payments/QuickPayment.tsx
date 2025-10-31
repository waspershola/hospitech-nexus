import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PaymentForm } from './PaymentForm';

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
        <PaymentForm
          guestId={guestId}
          organizationId={organizationId}
          bookingId={bookingId}
          prefilledAmount={prefilledAmount}
          expectedAmount={expectedAmount}
          isBookingPayment={isBookingPayment}
          onSuccess={onClose}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}
