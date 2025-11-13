import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePlatformFeeDisputes } from '@/hooks/usePlatformFeeDisputes';
import { AlertCircle, FileText } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DisputeFeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedLedgerIds: string[];
  totalDisputedAmount: number;
}

export function DisputeFeeDialog({
  open,
  onOpenChange,
  selectedLedgerIds,
  totalDisputedAmount,
}: DisputeFeeDialogProps) {
  const { createDispute, isSubmitting } = usePlatformFeeDisputes();
  const [disputeReason, setDisputeReason] = useState('');
  const [requestedAction, setRequestedAction] = useState<'waive' | 'reduce' | 'review'>('review');
  const [requestedAmount, setRequestedAmount] = useState('');
  const [supportingDocs, setSupportingDocs] = useState('');

  const handleSubmit = async () => {
    if (!disputeReason.trim()) {
      return;
    }

    const docs = supportingDocs.trim() 
      ? supportingDocs.split('\n').filter(doc => doc.trim()).map(doc => ({ reference: doc.trim() }))
      : [];

    await createDispute.mutateAsync({
      ledger_ids: selectedLedgerIds,
      dispute_reason: disputeReason,
      supporting_docs: docs,
      requested_action: requestedAction,
      requested_amount: requestedAction === 'reduce' && requestedAmount ? parseFloat(requestedAmount) : undefined,
    });

    // Reset form
    setDisputeReason('');
    setRequestedAction('review');
    setRequestedAmount('');
    setSupportingDocs('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Submit Platform Fee Dispute</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You are disputing {selectedLedgerIds.length} fee{selectedLedgerIds.length > 1 ? 's' : ''} totaling ₦{totalDisputedAmount.toLocaleString()}
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="requested-action">Requested Action</Label>
            <Select value={requestedAction} onValueChange={(value: any) => setRequestedAction(value)}>
              <SelectTrigger id="requested-action">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="waive">Waive Fee - Request complete fee removal</SelectItem>
                <SelectItem value="reduce">Reduce Fee - Request partial refund</SelectItem>
                <SelectItem value="review">Review Only - Request investigation without specific action</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {requestedAction === 'reduce' && (
            <div className="space-y-2">
              <Label htmlFor="requested-amount">Requested Refund Amount (₦)</Label>
              <Input
                id="requested-amount"
                type="number"
                placeholder="Enter amount to refund"
                value={requestedAmount}
                onChange={(e) => setRequestedAmount(e.target.value)}
                min="0"
                max={totalDisputedAmount}
              />
              <p className="text-xs text-muted-foreground">
                Maximum refund: ₦{totalDisputedAmount.toLocaleString()}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="dispute-reason">Dispute Reason *</Label>
            <Textarea
              id="dispute-reason"
              placeholder="Explain why you are disputing these fees..."
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              rows={4}
              required
            />
            <p className="text-xs text-muted-foreground">
              Provide detailed explanation of the issue (e.g., incorrect billing, service issues, duplicate charges)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="supporting-docs">
              <FileText className="h-4 w-4 inline mr-2" />
              Supporting Documentation (Optional)
            </Label>
            <Textarea
              id="supporting-docs"
              placeholder="Booking ID: BK-12345&#10;Transaction Reference: TXN-67890&#10;Screenshot URL: https://..."
              value={supportingDocs}
              onChange={(e) => setSupportingDocs(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Enter references one per line (booking IDs, transaction numbers, file URLs, etc.)
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !disputeReason.trim()}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Dispute'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
