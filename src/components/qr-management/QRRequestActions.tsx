import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useState } from 'react';
import { 
  DollarSign, 
  Gift, 
  Play, 
  CheckCircle, 
  UserCheck,
  Loader2,
  Printer,
  MoveRight,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { PaymentForm } from '@/modules/payments/PaymentForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ManagerApprovalModal } from '@/modules/payments/ManagerApprovalModal';
import { useQueryClient } from '@tanstack/react-query';
import { useRequestReceipt } from '@/hooks/useRequestReceipt';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import { generateRequestReference } from '@/lib/qr/requestReference';
import { isBillingCompleted } from '@/lib/qr/billingStatus';

interface QRRequestActionsProps {
  request: any;
  onStatusUpdate?: () => void;
  onClose?: () => void;
}

export function QRRequestActions({ request, onStatusUpdate, onClose }: QRRequestActionsProps) {
  const { user, tenantId } = useAuth();
  const queryClient = useQueryClient();
  const { printRequestReceipt, isPrinting } = useRequestReceipt();
  const [isUpdating, setIsUpdating] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showComplimentaryApproval, setShowComplimentaryApproval] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);

  const isAssignedToMe = request.assigned_to === user?.id;
  const guestPaymentPreference = request.metadata?.payment_choice || 'pay_now';
  
  // Phase 4: Check if billing is completed - COMPREHENSIVE check
  const billingCompleted = isBillingCompleted(request.billing_status);
  const billedAmount = request.billed_amount || request.metadata?.payment_info?.total_amount || 0;
  
  // DEBUG: Log billing status for troubleshooting
  console.log('[QRRequestActions] Billing status check:', {
    billing_status: request.billing_status,
    billed_amount: request.billed_amount,
    billingCompleted,
    transferred_to_frontdesk: request.transferred_to_frontdesk,
    request_id: request.id
  });

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

  const handleTransferToFrontDesk = async () => {
    if (!tenantId || !user) return;
    
    setIsUpdating(true);
    try {
      // PHASE-A-BILLING-V1: Generate billing reference code
      const billingRef = generateRequestReference(request.id);
      
      const { error } = await supabase
        .from('requests')
        .update({
          transferred_to_frontdesk: true,
          transferred_at: new Date().toISOString(),
          transferred_by: user.id,
          
          // PHASE-A-BILLING-V1: Set billing tracking fields
          billing_reference_code: billingRef,
          billing_routed_to: 'frontdesk',
          billing_status: 'pending_frontdesk',
          
          status: 'in_progress',
          metadata: {
            ...request.metadata,
            transfer_note: 'Requires front desk billing assistance',
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', request.id)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      // Log activity
      await supabase.rpc('log_request_activity', {
        p_tenant_id: tenantId,
        p_request_id: request.id,
        p_staff_id: user.id,
        p_action_type: 'transferred_to_frontdesk',
        p_metadata: { 
          billing_reference: billingRef,
          timestamp: new Date().toISOString() 
        }
      });

      toast.success(`Transferred to Front Desk (Ref: ${billingRef})`);
      queryClient.invalidateQueries({ queryKey: ['staff-requests'] });
      setShowTransferDialog(false);
      onStatusUpdate?.();
    } catch (error: any) {
      console.error('[QRRequestActions] Transfer error:', error);
      toast.error(error.message || 'Failed to transfer request');
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
        
        {/* PHASE 4: Show billing completed status */}
        {billingCompleted && (
          <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20 mb-3">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              <strong>Billed to Room Folio</strong>
              <div className="text-sm mt-1">
                ₦{billedAmount.toLocaleString()} charged on {request.billed_at ? format(new Date(request.billed_at), 'MMM d, h:mm a') : 'N/A'}
              </div>
              {request.billing_status === 'paid_direct' && (
                <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                  ✓ Payment collected via room folio
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}
        
        {/* ARCHITECTURAL RULE: NO FOLIO CHARGING FROM QR DRAWER
            All folio charges must be posted from Billing Center by Front Desk.
            Other departments use "Transfer to Front Desk" for room billing.
            This ensures proper separation of duties and financial controls. */}
        
        {/* Guest Payment Preference Display */}
        <div className="bg-muted p-2 rounded mb-3 text-xs">
          <strong>Guest Selected:</strong>{' '}
          {guestPaymentPreference === 'bill_to_room' 
            ? '📋 Bill to Room' 
            : '💳 Pay Now'
          }
        </div>
        
        <div className="space-y-2">
          {/* PHASE 4: Hide financial actions when billing is completed */}
          {!billingCompleted && (
            <>
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

              {/* PHASE-3-TRANSFER-V1: Transfer to Front Desk */}
              {!request.transferred_to_frontdesk && (
                <Button
                  onClick={() => setShowTransferDialog(true)}
                  disabled={isUpdating}
                  className="w-full"
                  variant="secondary"
                >
                  <MoveRight className="h-4 w-4 mr-2" />
                  Transfer to Front Desk
                </Button>
              )}
            </>
          )}

          {/* PHASE-3-PRINT-V1: Print Receipt (always available) */}
          <Button
            onClick={() => printRequestReceipt(request)}
            disabled={isUpdating || isPrinting}
            className="w-full"
            variant="outline"
          >
            <Printer className="h-4 w-4 mr-2" />
            {isPrinting ? 'Printing...' : 'Print Receipt'}
          </Button>

          {request.transferred_to_frontdesk && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Transferred to Front Desk on {format(new Date(request.transferred_at), 'MMM d, h:mm a')}
              </AlertDescription>
            </Alert>
          )}
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
            requestId={request.id} // PHASE-6: Pass requestId for automatic billing status sync
            expectedAmount={request.metadata?.payment_info?.total_amount || request.metadata?.payment_info?.subtotal || 0}
            onSuccess={async () => {
              const amount = request.metadata?.payment_info?.total_amount || request.metadata?.payment_info?.subtotal || 0;
              const guestName = request.metadata?.guest_name || 'Guest';
              
              // PHASE-6: Removed manual billing_status update - now handled automatically by Phase 5 backend
              
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

      {/* PHASE-3-TRANSFER-V1: Transfer Confirmation Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer to Front Desk</DialogTitle>
            <DialogDescription>
              This will flag this request for the Front Desk team to handle payment collection or folio billing. 
              The request will remain active until Front Desk completes it.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-4">
            <Button onClick={handleTransferToFrontDesk} disabled={isUpdating} className="flex-1">
              {isUpdating ? 'Transferring...' : 'Confirm Transfer'}
            </Button>
            <Button variant="outline" onClick={() => setShowTransferDialog(false)}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
