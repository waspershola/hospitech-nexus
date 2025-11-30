import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { ManagerApprovalModal } from '@/modules/payments/ManagerApprovalModal';

interface ForceCheckoutModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string, createReceivable: boolean, approvalToken: string) => void;
  balance: number;
  guestName?: string;
  roomNumber?: string;
  bookingId: string;
  isLoading?: boolean;
}

export function ForceCheckoutModal({
  open,
  onClose,
  onConfirm,
  balance,
  guestName,
  roomNumber,
  bookingId,
  isLoading = false,
}: ForceCheckoutModalProps) {
  const [reason, setReason] = useState('Manager override - guest checkout with outstanding balance');
  const [createReceivable, setCreateReceivable] = useState(true);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pendingCheckoutData, setPendingCheckoutData] = useState<{
    reason: string;
    createReceivable: boolean;
  } | null>(null);

  const handleConfirm = () => {
    if (!reason.trim()) {
      return;
    }
    // Store data and open PIN modal for approval
    setPendingCheckoutData({ reason, createReceivable });
    setShowPinModal(true);
  };

  const handlePinApproved = (approvalReason: string, approvalToken: string) => {
    if (!pendingCheckoutData) return;
    
    // Close PIN modal
    setShowPinModal(false);
    
    // Proceed with force checkout using the approval token
    onConfirm(pendingCheckoutData.reason, pendingCheckoutData.createReceivable, approvalToken);
    
    // Reset pending data
    setPendingCheckoutData(null);
  };

  const handleClose = () => {
    if (isLoading) return;
    setReason('Manager override - guest checkout with outstanding balance');
    setCreateReceivable(true);
    setPendingCheckoutData(null);
    setShowPinModal(false);
    onClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Manager Override Required
          </DialogTitle>
          <DialogDescription>
            Force checkout for guest with outstanding balance
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert variant="destructive">
            <AlertDescription className="space-y-2">
              <div className="font-semibold">Outstanding Balance: ₦{balance.toLocaleString()}</div>
              {guestName && <div>Guest: {guestName}</div>}
              {roomNumber && <div>Room: {roomNumber}</div>}
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Force Checkout *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for manager override..."
              rows={3}
              disabled={isLoading}
              required
            />
            <p className="text-sm text-muted-foreground">
              This will be recorded in audit logs
            </p>
          </div>

          <div className="flex items-center justify-between space-x-2 rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="create-receivable" className="font-medium">
                Create Receivable
              </Label>
              <p className="text-sm text-muted-foreground">
                Track outstanding balance as accounts receivable
              </p>
            </div>
            <Switch
              id="create-receivable"
              checked={createReceivable}
              onCheckedChange={setCreateReceivable}
              disabled={isLoading || balance <= 0}
            />
          </div>

          {balance <= 0 && (
            <Alert>
              <AlertDescription>
                Guest has no outstanding balance. Force checkout will process as a standard checkout.
              </AlertDescription>
            </Alert>
          )}

          <Alert>
            <AlertDescription className="text-sm space-y-2">
              <div className="font-medium">This action will:</div>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Complete the guest checkout immediately</li>
                <li>Close the guest folio</li>
                <li>Update room status to "Cleaning"</li>
                {balance > 0 && createReceivable && (
                  <li>Create a receivable for ₦{balance.toLocaleString()}</li>
                )}
                <li>Record manager override in audit logs</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!reason.trim() || isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Force Checkout
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Manager PIN Approval Modal */}
    <ManagerApprovalModal
      open={showPinModal}
      amount={balance}
      type="checkout_with_debt"
      actionReference={bookingId}
      onApprove={handlePinApproved}
      onReject={() => {
        setShowPinModal(false);
        setPendingCheckoutData(null);
      }}
    />
    </>
  );
}
