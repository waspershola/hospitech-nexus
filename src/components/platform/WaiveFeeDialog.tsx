import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, DollarSign } from 'lucide-react';
import { usePlatformFeeWaiver } from '@/hooks/usePlatformFeeWaiver';

interface WaiveFeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedFees: Array<{
    id: string;
    tenant_id: string;
    tenant_name?: string;
    fee_amount: number;
    reference_type: string;
    reference_id: string;
    status: string;
  }>;
}

export function WaiveFeeDialog({ open, onOpenChange, selectedFees }: WaiveFeeDialogProps) {
  const [waivedReason, setWaivedReason] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  const { waiveFee } = usePlatformFeeWaiver();

  const totalAmount = selectedFees.reduce((sum, fee) => sum + Number(fee.fee_amount), 0);
  const ledgerIds = selectedFees.map(fee => fee.id);

  const handleWaive = () => {
    if (!waivedReason.trim()) {
      return;
    }

    waiveFee.mutate(
      {
        ledger_ids: ledgerIds,
        waived_reason: waivedReason.trim(),
        approval_notes: approvalNotes.trim() || undefined
      },
      {
        onSuccess: () => {
          setWaivedReason('');
          setApprovalNotes('');
          onOpenChange(false);
        }
      }
    );
  };

  const handleCancel = () => {
    setWaivedReason('');
    setApprovalNotes('');
    onOpenChange(false);
  };

  // Check for invalid statuses
  const invalidFees = selectedFees.filter(fee => !['pending', 'billed'].includes(fee.status));
  const hasInvalidFees = invalidFees.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Waive Platform Fee{selectedFees.length > 1 ? 's' : ''}
          </DialogTitle>
          <DialogDescription>
            Manually waive platform fees for special cases or customer support. This action requires a reason and is logged in the audit trail.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {hasInvalidFees && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {invalidFees.length} fee(s) cannot be waived. Only fees with status "pending" or "billed" can be waived.
                Current invalid statuses: {invalidFees.map(f => f.status).join(', ')}
              </AlertDescription>
            </Alert>
          )}

          {/* Fee Summary */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Fees to Waive:</span>
              <span className="text-sm font-semibold">{selectedFees.length} fee{selectedFees.length > 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Amount:</span>
              <span className="text-lg font-bold text-primary">₦{totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Fee Details */}
          <div className="max-h-48 overflow-y-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left p-2 font-medium">Tenant</th>
                  <th className="text-left p-2 font-medium">Type</th>
                  <th className="text-right p-2 font-medium">Amount</th>
                  <th className="text-center p-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {selectedFees.map((fee) => (
                  <tr key={fee.id} className="border-t">
                    <td className="p-2">{fee.tenant_name || fee.tenant_id.slice(0, 8)}</td>
                    <td className="p-2 capitalize">{fee.reference_type.replace('_', ' ')}</td>
                    <td className="p-2 text-right">₦{Number(fee.fee_amount).toFixed(2)}</td>
                    <td className="p-2 text-center">
                      <span className={`inline-block px-2 py-1 rounded text-xs ${
                        fee.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        fee.status === 'billed' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {fee.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Waiver Reason (Required) */}
          <div className="space-y-2">
            <Label htmlFor="waived-reason" className="text-sm font-medium">
              Waiver Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="waived-reason"
              placeholder="e.g., Customer support request - billing dispute resolved in tenant's favor"
              value={waivedReason}
              onChange={(e) => setWaivedReason(e.target.value)}
              rows={3}
              className="resize-none"
              disabled={waiveFee.isPending}
            />
            <p className="text-xs text-muted-foreground">
              This reason will be recorded in the audit trail and displayed to the tenant.
            </p>
          </div>

          {/* Approval Notes (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="approval-notes" className="text-sm font-medium">
              Internal Approval Notes (Optional)
            </Label>
            <Textarea
              id="approval-notes"
              placeholder="Internal notes for platform admin team (not visible to tenant)"
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              rows={2}
              className="resize-none"
              disabled={waiveFee.isPending}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={waiveFee.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleWaive}
            disabled={
              !waivedReason.trim() ||
              waiveFee.isPending ||
              hasInvalidFees ||
              selectedFees.length === 0
            }
          >
            {waiveFee.isPending ? 'Waiving...' : `Waive ${selectedFees.length} Fee${selectedFees.length > 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
