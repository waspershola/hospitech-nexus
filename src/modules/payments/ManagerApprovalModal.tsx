import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ManagerApprovalModalProps {
  open: boolean;
  amount: number;
  type: 'overpayment' | 'underpayment' | 'refund' | 'write_off' | 'room_rebate' | 'force_cancel' | 'checkout_with_debt' | 'transfer_charge' | 'split_charge' | 'merge_folios' | 'reverse_transaction';
  actionReference?: string;
  onApprove: (reason: string, approvalToken: string) => void;
  onReject: () => void;
}

export function ManagerApprovalModal({
  open,
  amount,
  type,
  actionReference,
  onApprove,
  onReject,
}: ManagerApprovalModalProps) {
  const [reason, setReason] = useState('');
  const [pin, setPin] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const { toast } = useToast();

  const isValid = reason.trim().length >= 10 && pin.length === 6;

  const handleApprove = async () => {
    if (!isValid) return;

    setIsValidating(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-manager-pin', {
        body: {
          pin,
          action_type: type,
          action_reference: actionReference,
          amount,
          reason: reason.trim()
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.success && data?.approval_token) {
        onApprove(reason.trim(), data.approval_token);
        setReason('');
        setPin('');
      } else {
        throw new Error('Invalid response from validation');
      }
    } catch (error: any) {
      console.error('[MANAGER-APPROVAL-V1] Validation failed:', error);
      toast({
        title: 'Approval Failed',
        description: error.message || 'Failed to validate manager PIN',
        variant: 'destructive',
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleClose = () => {
    if (!isValidating) {
      setReason('');
      setPin('');
      onReject();
    }
  };

  const getTypeLabel = () => {
    switch (type) {
      case 'overpayment': return 'Overpayment';
      case 'underpayment': return 'Underpayment';
      case 'refund': return 'Refund';
      case 'write_off': return 'Write-off';
      case 'room_rebate': return 'Room Rebate';
      case 'force_cancel': return 'Force Cancel';
      case 'checkout_with_debt': return 'Checkout with Outstanding Debt';
      case 'transfer_charge': return 'Transfer Charge';
      case 'split_charge': return 'Split Charge';
      case 'merge_folios': return 'Merge Folios';
      case 'reverse_transaction': return 'Reverse Transaction';
      default: return 'Transaction';
    }
  };

  const getDescription = () => {
    switch (type) {
      case 'overpayment':
        return (
          <>
            Guest is paying <strong>₦{amount.toLocaleString()} MORE</strong> than expected.
            <br />
            This large overpayment requires manager approval before processing.
          </>
        );
      case 'underpayment':
        return (
          <>
            Guest is leaving with <strong>₦{amount.toLocaleString()} UNPAID</strong>.
            <br />
            This large outstanding balance requires manager approval before checkout.
          </>
        );
      case 'refund':
        return (
          <>
            Refunding <strong>₦{amount.toLocaleString()}</strong> to guest.
            <br />
            This refund requires manager approval before processing.
          </>
        );
      case 'write_off':
        return (
          <>
            Writing off <strong>₦{amount.toLocaleString()}</strong> from guest balance.
            <br />
            This write-off requires manager approval before processing.
          </>
        );
      case 'room_rebate':
        return (
          <>
            Applying room rebate of <strong>₦{amount.toLocaleString()}</strong>.
            <br />
            This rebate requires manager approval before processing.
          </>
        );
      case 'force_cancel':
        return (
          <>
            Force cancelling booking with amount <strong>₦{amount.toLocaleString()}</strong>.
            <br />
            This cancellation requires manager approval before processing.
          </>
        );
      case 'checkout_with_debt':
        return (
          <>
            Checking out guest with outstanding balance of <strong>₦{amount.toLocaleString()}</strong>.
            <br />
            This checkout with debt requires manager approval before processing.
          </>
        );
      case 'transfer_charge':
        return (
          <>
            Transferring charge of <strong>₦{amount.toLocaleString()}</strong> between folios.
            <br />
            This transfer requires manager approval before processing.
          </>
        );
      case 'split_charge':
        return (
          <>
            Splitting charge of <strong>₦{amount.toLocaleString()}</strong> across folios.
            <br />
            This split requires manager approval before processing.
          </>
        );
      case 'merge_folios':
        return (
          <>
            Merging folios with total amount <strong>₦{amount.toLocaleString()}</strong>.
            <br />
            This merge requires manager approval before processing.
          </>
        );
      case 'reverse_transaction':
        return (
          <>
            Reversing transaction of <strong>₦{amount.toLocaleString()}</strong>.
            <br />
            This reversal requires manager approval before processing.
          </>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            Manager Approval Required
          </DialogTitle>
          <DialogDescription>
            {getDescription()}
          </DialogDescription>
        </DialogHeader>
        
        <Alert>
          <AlertDescription className="text-sm">
            This {getTypeLabel()} requires manager PIN verification to proceed.
          </AlertDescription>
        </Alert>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="manager-pin">Manager PIN (6 digits)</Label>
            <Input
              id="manager-pin"
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Enter 6-digit PIN"
              maxLength={6}
              className="text-center text-2xl tracking-widest"
              disabled={isValidating}
            />
            <p className="text-xs text-muted-foreground">
              Enter your 6-digit manager PIN to approve this transaction
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
              disabled={isValidating}
            />
            <p className="text-xs text-muted-foreground">
              Minimum 10 characters. This will be logged for audit purposes.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isValidating}>
            Cancel Transaction
          </Button>
          <Button 
            onClick={handleApprove}
            disabled={!isValid || isValidating}
          >
            {isValidating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Validating...
              </>
            ) : (
              'Approve Transaction'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
