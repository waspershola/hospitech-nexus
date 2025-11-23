import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useState } from 'react';
import { 
  DollarSign, 
  FileText, 
  Gift, 
  Play, 
  CheckCircle, 
  UserCheck,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { PaymentForm } from '@/modules/payments/PaymentForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ManagerApprovalModal } from '@/modules/payments/ManagerApprovalModal';
import { useQueryClient } from '@tanstack/react-query';
import { AddChargeToFolioDialog } from './AddChargeToFolioDialog';

interface QRRequestActionsProps {
  request: any;
  onStatusUpdate?: () => void;
  onClose?: () => void;
}

export function QRRequestActions({ request, onStatusUpdate, onClose }: QRRequestActionsProps) {
  const { user, tenantId } = useAuth();
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showComplimentaryApproval, setShowComplimentaryApproval] = useState(false);
  const [showAddCharge, setShowAddCharge] = useState(false);
  const [selectedFolioId, setSelectedFolioId] = useState<string | null>(null);

  const isAssignedToMe = request.assigned_to === user?.id;
  
  // PHASE-2-SIMPLIFICATION: No distinction between room/location QR
  // Staff manually decides all financial actions
  const hasCharge = request.metadata?.payment_info?.billable;
  const guestPaymentPreference = request.metadata?.payment_choice || 'pay_now';

  const handleStatusChange = async (newStatus: string) => {
    if (!tenantId) return;

    setIsUpdating(true);
    try {
      const updateData: any = { 
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      // PHASE-2: Set responded_at on first status change from pending
      if (request.status === 'pending' && !request.responded_at) {
        updateData.responded_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('requests')
        .update(updateData)
        .eq('id', request.id)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      toast.success('Request status updated');
      queryClient.invalidateQueries({ queryKey: ['staff-requests'] });
      onStatusUpdate?.();
    } catch (error: any) {
      console.error('[QRRequestActions] Error updating status:', error);
      toast.error(error.message || 'Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAssignToMe = async () => {
    if (!user || !tenantId) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('requests')
        .update({
          assigned_to: user.id,
          assigned_at: new Date().toISOString(),
          status: 'in_progress',
          updated_at: new Date().toISOString(),
        })
        .eq('id', request.id)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      toast.success('Request assigned to you');
      queryClient.invalidateQueries({ queryKey: ['staff-requests'] });
      onStatusUpdate?.();
    } catch (error: any) {
      console.error('[QRRequestActions] Error assigning request:', error);
      toast.error(error.message || 'Failed to assign request');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleComplimentaryApproval = async (reason: string, approvalToken: string) => {
    if (!tenantId) return;

    setIsUpdating(true);
    try {
      // Mark request as completed with complimentary flag
      const { error: requestError } = await supabase
        .from('requests')
        .update({
          status: 'completed',
          metadata: {
            ...request.metadata,
            complimentary: true,
            approved_by: user?.id,
            approval_token: approvalToken,
            approval_reason: reason,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', request.id)
        .eq('tenant_id', tenantId);

      if (requestError) throw requestError;

      toast.success('Marked as complimentary (no charge)');
      queryClient.invalidateQueries({ queryKey: ['staff-requests'] });
      setShowComplimentaryApproval(false);
      onStatusUpdate?.();
      onClose?.();
    } catch (error: any) {
      console.error('[QRRequestActions] Error marking complimentary:', error);
      toast.error(error.message || 'Failed to mark as complimentary');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Assignment Section */}
      {!isAssignedToMe && request.status === 'pending' && (
        <Card className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Assignment
          </h3>
          <Button
            onClick={handleAssignToMe}
            disabled={isUpdating}
            className="w-full"
            variant="outline"
          >
            {isUpdating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <UserCheck className="h-4 w-4 mr-2" />
            )}
            Assign to Me
          </Button>
        </Card>
      )}

      {/* Status Management */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Status Management</h3>
        <div className="grid grid-cols-2 gap-2">
          {request.status === 'pending' && (
            <Button
              onClick={() => handleStatusChange('in_progress')}
              disabled={isUpdating}
              variant="default"
            >
              <Play className="h-4 w-4 mr-2" />
              Start Handling
            </Button>
          )}
          
          {request.status === 'in_progress' && (
            <Button
              onClick={() => handleStatusChange('completed')}
              disabled={isUpdating}
              variant="default"
              className="col-span-2"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark Completed
            </Button>
          )}
        </div>
      </Card>

      {/* Financial Actions */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Financial Actions
        </h3>
        
        {/* Guest Payment Preference Display */}
        <div className="bg-muted p-2 rounded mb-3 text-xs">
          <strong>Guest Selected:</strong>{' '}
          {guestPaymentPreference === 'bill_to_room' 
            ? '📋 Bill to Room' 
            : '💳 Pay Now'
          }
        </div>
        
        <div className="space-y-2">
          {/* Add Charge to Folio - Always available for all QR types */}
          {hasCharge && (
            <Button
              onClick={() => setShowAddCharge(true)}
              disabled={isUpdating}
              className="w-full"
              variant="default"
            >
              <FileText className="h-4 w-4 mr-2" />
              Add Charge to Folio
            </Button>
          )}
          
          {/* Collect Payment (all QR types) */}
            <Button
              onClick={() => setShowPaymentForm(true)}
              disabled={isUpdating}
              className="w-full"
              variant="outline"
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Collect Payment
            </Button>

          {/* Mark as Complimentary */}
          <Button
            onClick={() => setShowComplimentaryApproval(true)}
            disabled={isUpdating}
            className="w-full"
            variant="outline"
          >
            <Gift className="h-4 w-4 mr-2" />
            Mark as Complimentary
          </Button>
        </div>
      </Card>

      {/* Payment Form Dialog */}
      <Dialog open={showPaymentForm} onOpenChange={setShowPaymentForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Collect Payment</DialogTitle>
          </DialogHeader>
          <PaymentForm
            bookingId={request.metadata?.booking_id}
            guestId={request.guest_id}
            expectedAmount={request.metadata?.payment_info?.total_amount || request.metadata?.payment_info?.subtotal || 0}
            onSuccess={() => {
              const amount = request.metadata?.payment_info?.total_amount || request.metadata?.payment_info?.subtotal || 0;
              const guestName = request.metadata?.guest_name || 'Guest';
              
              setShowPaymentForm(false);
              handleStatusChange('completed');
              
              // PHASE-3: Enhanced payment success notification
              toast.success('Payment Collected Successfully', {
                description: `₦${amount.toLocaleString()} received from ${guestName}`,
                duration: 5000,
                icon: <CheckCircle className="h-5 w-5 text-green-500" />
              });
            }}
            onCancel={() => setShowPaymentForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Complimentary Approval Modal */}
      <ManagerApprovalModal
        open={showComplimentaryApproval}
        amount={request.metadata?.payment_info?.total_amount || request.metadata?.payment_info?.subtotal || 0}
        type="write_off"
        actionReference={request.id}
        onApprove={handleComplimentaryApproval}
        onReject={() => setShowComplimentaryApproval(false)}
      />

      {/* Add Charge to Folio Dialog (All QRs - PHASE-2-SIMPLIFICATION) */}
      <AddChargeToFolioDialog
        open={showAddCharge}
        onOpenChange={setShowAddCharge}
        request={request}
        onSuccess={() => {
          setShowAddCharge(false);
          queryClient.invalidateQueries({ queryKey: ['staff-requests'] });
          toast.success('Charge posted to folio');
          onStatusUpdate?.();
        }}
      />
    </div>
  );
}
