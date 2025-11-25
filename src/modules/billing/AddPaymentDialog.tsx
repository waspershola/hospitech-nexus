import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { QuickPaymentForm } from '@/modules/frontdesk/components/QuickPaymentForm';

interface AddPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  guestId: string;
  expectedAmount: number;
}

/**
 * Add Payment Dialog - Unified Payment Interface for Billing Center
 * Wraps QuickPaymentForm in a modal dialog matching Add Charge pattern
 * Version: UNIFIED-PAYMENT-DIALOG-V1
 */
export function AddPaymentDialog({ 
  open, 
  onOpenChange, 
  bookingId, 
  guestId, 
  expectedAmount 
}: AddPaymentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Payment to Folio</DialogTitle>
          <DialogDescription>
            Record a payment against the guest's folio balance
          </DialogDescription>
        </DialogHeader>
        <QuickPaymentForm
          bookingId={bookingId}
          guestId={guestId}
          expectedAmount={expectedAmount}
          onSuccess={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
