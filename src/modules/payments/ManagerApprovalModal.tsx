import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ManagerApprovalModalProps {
  open: boolean;
  amount: number;
  type: 'overpayment' | 'underpayment';
  onApprove: (reason: string) => void;
  onReject: () => void;
}

export function ManagerApprovalModal({
  open,
  amount,
  type,
  onApprove,
  onReject,
}: ManagerApprovalModalProps) {
  const [reason, setReason] = useState('');
  const [pin, setPin] = useState('');

  const isValid = reason.trim().length > 10 && pin.length === 4;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onReject()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            Manager Approval Required
          </DialogTitle>
          <DialogDescription>
            {type === 'overpayment' ? (
              <>
                Guest is paying <strong>₦{amount.toLocaleString()} MORE</strong> than expected.
                <br />
                This large overpayment requires manager approval before processing.
              </>
            ) : (
              <>
                Guest is leaving with <strong>₦{amount.toLocaleString()} UNPAID</strong>.
                <br />
                This large outstanding balance requires manager approval before checkout.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <Alert>
          <AlertDescription className="text-sm">
            This transaction requires manager or owner approval to proceed.
          </AlertDescription>
        </Alert>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="manager-pin">Manager PIN</Label>
            <Input
              id="manager-pin"
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value.slice(0, 4))}
              placeholder="Enter 4-digit PIN"
              maxLength={4}
            />
            <p className="text-xs text-muted-foreground">
              Enter your manager PIN to approve this transaction
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="approval-reason">Approval Reason *</Label>
            <Textarea
              id="approval-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why you're approving this transaction..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Minimum 10 characters. This will be logged for audit purposes.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onReject}>
            Cancel Transaction
          </Button>
          <Button 
            onClick={() => {
              if (isValid) {
                onApprove(reason);
              }
            }}
            disabled={!isValid}
          >
            Approve Transaction
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}