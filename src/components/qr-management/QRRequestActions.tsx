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
import { ManagerApprovalModal } from '@/components/staff/ManagerApprovalModal';
import { useQueryClient } from '@tanstack/react-query';

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

  const isAssignedToMe = request.assigned_to === user?.id;

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

  const handleComplimentaryApproval = async (approvalToken: string) => {
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
        <div className="space-y-2">
          <Button
            onClick={() => setShowPaymentForm(true)}
            disabled={isUpdating}
            className="w-full"
            variant="outline"
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Collect Payment
          </Button>

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
            expectedAmount={request.metadata?.total_amount}
            onSuccess={() => {
              setShowPaymentForm(false);
              handleStatusChange('completed');
              toast.success('Payment recorded successfully');
            }}
            onCancel={() => setShowPaymentForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Complimentary Approval Modal */}
      <ManagerApprovalModal
        isOpen={showComplimentaryApproval}
        onClose={() => setShowComplimentaryApproval(false)}
        onApprove={handleComplimentaryApproval}
        actionType="complimentary_service"
        amount={request.metadata?.total_amount || 0}
        reason={`Complimentary ${request.service_category} for ${request.metadata?.guest_name || 'guest'}`}
      />
    </div>
  );
}
