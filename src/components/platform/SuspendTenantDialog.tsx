import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle } from 'lucide-react';
import { useSuspendTenant } from '@/hooks/useSuspendTenant';

interface SuspendTenantDialogProps {
  tenantId: string;
  tenantName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SuspendTenantDialog({ 
  tenantId, 
  tenantName, 
  open, 
  onOpenChange 
}: SuspendTenantDialogProps) {
  const [reason, setReason] = useState('');
  const suspendTenant = useSuspendTenant();

  const handleSuspend = () => {
    if (!reason.trim()) {
      return;
    }

    suspendTenant.mutate(
      { tenantId, reason },
      {
        onSuccess: () => {
          onOpenChange(false);
          setReason('');
        }
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Suspend Tenant
          </DialogTitle>
          <DialogDescription>
            This will block all users of <strong>{tenantName}</strong> from accessing the system.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Suspension Reason *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter the reason for suspension (e.g., Payment overdue, Terms violation, etc.)"
              rows={4}
              required
            />
            <p className="text-xs text-muted-foreground">
              This reason will be recorded in the activity log and visible to super admins.
            </p>
          </div>

          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-destructive">Warning:</p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>All tenant users will be immediately logged out</li>
              <li>No one can log in until tenant is reactivated</li>
              <li>Active bookings will not be affected</li>
              <li>This action is reversible</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={suspendTenant.isPending}
          >
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleSuspend}
            disabled={!reason.trim() || suspendTenant.isPending}
          >
            {suspendTenant.isPending ? 'Suspending...' : 'Suspend Tenant'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
