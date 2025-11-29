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
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const isAssignedToMe = request.assigned_to === user?.id;
  const guestPaymentPreference = request.metadata?.payment_choice || 'pay_now';
  
  // PHASE 3: Calculate payment amounts for partial payment handling
  const expectedAmount = request.metadata?.payment_info?.total_amount || 
                        request.metadata?.payment_info?.subtotal || 0;
  const billedAmount = request.billed_amount || 0;
  const remainingBalance = Math.max(0, expectedAmount - billedAmount);
  const isFullyPaid = remainingBalance === 0 && billedAmount > 0;
  
  // Phase 4: Check if billing is completed AND fully paid OR transferred to front desk
  const billingCompleted = isBillingCompleted(request.billing_status);
  const shouldHideActions = (billingCompleted && isFullyPaid) || request.transferred_to_frontdesk;
  const isComplimentary = request.metadata?.complimentary === true;

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
      console.log('[QRRequestActions] PAYMENT-FIX-V4-AUDIT: Processing complimentary with approval');
      
      // Get staff ID from user ID (FIX: billing_processed_by requires staff.id not user.id)
      const { data: staffData } = await supabase
        .from('staff')
        .select('id, full_name')
        .eq('user_id', user?.id)
        .eq('tenant_id', tenantId)
        .single();
      
      if (!staffData) {
        throw new Error('Staff record not found');
      }
      
      const amount = expectedAmount;
      
      // Update request with complimentary status AND billing fields
      const { error: requestError } = await supabase
        .from('requests')
        .update({
          status: 'completed',
          billing_status: 'paid_direct',
          paid_at: new Date().toISOString(),
          billing_processed_by: staffData.id, // FIX: Use staff.id not user.id
          billed_amount: amount,
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
      
      // PHASE 2: Log complimentary approval activity (PARAMETER-FIX-V1)
      try {
        const { error: logError } = await supabase.rpc('log_request_activity', {
          p_tenant_id: tenantId,
          p_request_id: request.id,
          p_staff_id: staffData.id,
          p_action_type: 'complimentary',
          p_metadata: {
            amount: amount.toString(),
            reason: reason,
            approval_token: approvalToken,
            staff_name: staffData.full_name,
            version: 'COMPLIMENTARY-AUDIT-V2-PARAM-FIX',
          },
        });
        if (logError) {
          console.error('[QRRequestActions] COMPLIMENTARY-AUDIT-V2 RPC Error:', {
            error: logError,
            code: logError.code,
            message: logError.message,
            details: logError.details,
            hint: logError.hint,
          });
        } else {
          console.log('[QRRequestActions] COMPLIMENTARY-AUDIT-V2: Activity logged successfully');
        }
      } catch (logError: any) {
        console.error('[QRRequestActions] COMPLIMENTARY-AUDIT-V2 Exception:', {
          error: logError,
          message: logError?.message,
          stack: logError?.stack,
        });
      }
      
      // PHASE-3-LEDGER-V1: Create complimentary ledger entry
      try {
        console.log('[QRRequestActions] PHASE-3-LEDGER-V1: Creating complimentary ledger entry');
        
        const finalDepartment = request.metadata?.department || 'GUEST SERVICES';
        
        const { error: ledgerError } = await supabase.rpc('insert_ledger_entry', {
          p_tenant_id: tenantId,
          p_transaction_type: 'credit',
          p_amount: amount,
          p_description: `Complimentary - ${request.type}`,
          p_reference_type: 'qr_request',
          p_reference_id: request.id,
          p_category: 'complimentary',
          p_payment_method: 'complimentary',
          p_source_type: 'complimentary',
          p_department: finalDepartment,
          p_folio_id: null,
          p_booking_id: request.booking_id || null,
          p_guest_id: request.guest_id || null,
          p_room_id: request.room_id || null,
          p_payment_method_id: null,
          p_payment_provider_id: null,
          p_payment_location_id: null,
          p_organization_id: null,
          p_shift: null,
          p_staff_id: staffData.id,
          p_qr_request_id: request.id,
          p_metadata: {
            reason: reason,
            approved_by: user?.id,
            approval_token: approvalToken,
            guest_name: request.metadata?.guest_name || request.guest_name || 'Guest',
            service_type: request.type,
            staff_name: staffData.full_name,
            version: 'PHASE-3-LEDGER-V1'
          }
        });
        
        if (ledgerError) {
          console.error('[QRRequestActions] PHASE-3-LEDGER-V1: Failed to create complimentary ledger entry (non-blocking):', ledgerError);
        } else {
          console.log('[QRRequestActions] PHASE-3-LEDGER-V1: Complimentary ledger entry created successfully');
        }
      } catch (ledgerErr: any) {
        console.error('[QRRequestActions] PHASE-3-LEDGER-V1: Ledger exception (non-blocking):', ledgerErr);
      }
      
      console.log('[QRRequestActions] PAYMENT-FIX-V2: Complimentary status updated, forcing refetch...');
      
      // Force immediate refetch
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['staff-requests'], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['qr-request-detail', request.id], type: 'active' }),
      ]);

      toast.success('Marked as complimentary (no charge)', {
        description: `₦${amount.toLocaleString()} - Billing status updated`,
      });
      setShowComplimentaryApproval(false);
      onStatusUpdate?.();
      onClose?.();
    } catch (error: any) {
      console.error('[QRRequestActions] Complimentary error:', error);
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
        
        {/* PHASE 2: Show complimentary vs payment completed status */}
        {billingCompleted && isFullyPaid && isComplimentary && (
          <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20 mb-3">
            <Gift className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              <strong>Marked Complimentary</strong>
              <div className="text-sm mt-1">
                ₦{billedAmount.toLocaleString()} - No charge applied
              </div>
              {request.metadata?.approval_reason && (
                <div className="text-xs text-amber-600 dark:text-amber-400 mt-1 italic">
                  Reason: {request.metadata.approval_reason}
                </div>
              )}
              {request.billing_processed_by && (
                <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  Approved by staff
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}
        
        {billingCompleted && isFullyPaid && !isComplimentary && (
          <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20 mb-3">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              <strong>Payment Completed</strong>
              <div className="text-sm mt-1">
                ₦{billedAmount.toLocaleString()} paid on {request.paid_at ? format(new Date(request.paid_at), 'MMM d, h:mm a') : 'N/A'}
              </div>
              <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                ✓ Payment collected successfully
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        {/* PHASE 3: Show partial payment alert */}
        {billedAmount > 0 && remainingBalance > 0 && (
          <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20 mb-3">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              <strong>Partial Payment Received</strong>
              <div className="text-sm mt-1">
                Paid: ₦{billedAmount.toLocaleString()} | 
                Remaining: ₦{remainingBalance.toLocaleString()}
              </div>
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
          {/* PHASE 2 & 3: Hide financial actions ONLY when fully paid */}
          {!shouldHideActions && (
            <>
              {/* Collect Payment (all QR types) - PHASE 3: Show remaining amount if partial */}
              <Button
                onClick={() => setShowPaymentForm(true)}
                disabled={isUpdating || isProcessingPayment}
                className="w-full"
                variant="outline"
              >
                {isProcessingPayment ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</>
                ) : (
                  <><DollarSign className="h-4 w-4 mr-2" />
                  {remainingBalance > 0 && billedAmount > 0 
                    ? `Collect Remaining ₦${remainingBalance.toLocaleString()}` 
                    : 'Collect Payment'
                  }</>
                )}
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
            <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950/20">
              <MoveRight className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 dark:text-blue-200">
                <strong>Transferred to Front Desk</strong>
                <div className="text-sm mt-1">
                  {request.transferred_at && format(new Date(request.transferred_at), 'MMM d, h:mm a')}
                </div>
                {request.billing_reference_code && (
                  <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-mono">
                    Ref: {request.billing_reference_code}
                  </div>
                )}
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
            requestId={request.id}
            expectedAmount={remainingBalance > 0 ? remainingBalance : expectedAmount} // PHASE 3: Pre-fill remaining amount
            onSuccess={async (paymentId, paymentContext) => {
              setIsProcessingPayment(true);
              try {
                const amount = remainingBalance > 0 ? remainingBalance : expectedAmount;
                const guestName = request.metadata?.guest_name || 'Guest';
                
                console.log('[QRRequestActions] PAYMENT-FIX-V4-AUDIT: Payment recorded, logging activity...');
                
                // Get staff ID from user ID (FIX: billing_processed_by requires staff.id not user.id)
                const { data: staffData } = await supabase
                  .from('staff')
                  .select('id')
                  .eq('user_id', user?.id)
                  .eq('tenant_id', tenantId)
                  .single();
                
                if (!staffData) {
                  throw new Error('Staff record not found');
                }
                
                // Get current billed_amount from database for accurate calculation
                const { data: currentRequest } = await supabase
                  .from('requests')
                  .select('billed_amount')
                  .eq('id', request.id)
                  .single();
                
                const currentBilled = currentRequest?.billed_amount || 0;
                const newBilledAmount = currentBilled + amount;
                
                // Step 1: Update billing_status in database
                const { error: statusError } = await supabase
                  .from('requests')
                  .update({
                    billing_status: 'paid_direct',
                    paid_at: new Date().toISOString(),
                    billing_processed_by: staffData.id, // FIX: Use staff.id not user.id
                    billed_amount: newBilledAmount,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', request.id)
                  .eq('tenant_id', tenantId);
                
                if (statusError) {
                  console.error('[QRRequestActions] PAYMENT-FIX-V2: Failed to update billing status:', statusError);
                  toast.error('Payment recorded but status update failed. Please refresh.');
                  return;
                }
                
                // PHASE 1: Log payment collection activity (PARAMETER-FIX-V1)
                if (paymentContext) {
                  try {
                    const { error: logError } = await supabase.rpc('log_request_activity', {
                      p_tenant_id: tenantId,
                      p_request_id: request.id,
                      p_staff_id: staffData.id,
                      p_action_type: 'payment_collected',
                      p_metadata: {
                        amount: amount.toString(),
                        payment_method: paymentContext.method,
                        payment_provider_id: paymentContext.provider_id,
                        payment_location_id: paymentContext.location_id || null,
                        payment_id: paymentContext.paymentId,
                        provider_name: paymentContext.provider_name,
                        version: 'PAYMENT-AUDIT-V2-PARAM-FIX',
                      },
                    });
                    if (logError) {
                      console.error('[QRRequestActions] PAYMENT-AUDIT-V2 RPC Error:', {
                        error: logError,
                        code: logError.code,
                        message: logError.message,
                        details: logError.details,
                        hint: logError.hint,
                        params: {
                          p_tenant_id: tenantId,
                          p_request_id: request.id,
                          p_staff_id: staffData.id,
                          p_action_type: 'payment_collected',
                          p_amount: amount,
                        }
                      });
                    } else {
                      console.log('[QRRequestActions] PAYMENT-AUDIT-V2: Activity logged successfully');
                    }
                  } catch (logError: any) {
                    console.error('[QRRequestActions] PAYMENT-AUDIT-V2 Exception:', {
                      error: logError,
                      message: logError?.message,
                      stack: logError?.stack,
                    });
                  }
                }
                
                console.log('[QRRequestActions] PAYMENT-FIX-V2: Billing status updated, forcing refetch...');
                
                // Step 2: Force immediate refetch (don't just invalidate)
                await Promise.all([
                  queryClient.refetchQueries({ 
                    queryKey: ['staff-requests'],
                    type: 'active'
                  }),
                  queryClient.refetchQueries({ 
                    queryKey: ['qr-request-detail', request.id],
                    type: 'active'
                  }),
                ]);
                
                console.log('[QRRequestActions] PAYMENT-FIX-V2: Refetch complete');
                
                // Step 3: Update local request status
                handleStatusChange('completed');
                
                // Step 4: Close form and notify
                setShowPaymentForm(false);
                onStatusUpdate?.();
                
                toast.success('Payment Collected Successfully', {
                  description: `₦${amount.toLocaleString()} from ${guestName} - Status updated to Paid`,
                  duration: 5000,
                });
              } finally {
                setIsProcessingPayment(false);
              }
            }}
            onCancel={() => setShowPaymentForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Complimentary Approval Modal - PHASE 3: Pass remaining amount for partial payments */}
      <ManagerApprovalModal
        open={showComplimentaryApproval}
        amount={remainingBalance > 0 ? remainingBalance : expectedAmount}
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
