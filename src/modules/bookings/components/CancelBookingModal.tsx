import { useState } from 'react';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, XCircle, Loader2, DollarSign, Info } from 'lucide-react';
import { toast } from 'sonner';
import { differenceInDays, format } from 'date-fns';

interface CancelBookingModalProps {
  open: boolean;
  onClose: () => void;
  bookingId: string;
}

type CancellationPolicy = 'full_refund' | 'partial_refund' | 'no_refund' | 'custom';

type BookingWithRelations = {
  id: string;
  guest_id: string;
  room_id: string;
  organization_id: string | null;
  check_in: string;
  check_out: string;
  status: string;
  total_amount: number;
  booking_reference: string;
  metadata?: any;
  guest?: { name: string; email: string; phone: string } | null;
  room?: { number: string; type: string } | null;
  organization?: any;
};

export function CancelBookingModal({ open, onClose, bookingId }: CancelBookingModalProps) {
  const { user, tenantId } = useAuth();
  const queryClient = useQueryClient();
  
  const [cancellationReason, setCancellationReason] = useState('');
  const [refundPolicy, setRefundPolicy] = useState<CancellationPolicy>('full_refund');
  const [customRefundPercent, setCustomRefundPercent] = useState(100);

  // Fetch booking details
  const { data: booking, isLoading } = useQuery<BookingWithRelations>({
    queryKey: ['booking', bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (error) throw error;
      
      const result: BookingWithRelations = data as BookingWithRelations;
      
      // Fetch guest and room separately to bypass RLS join issues
      if (data.guest_id) {
        const { data: guestData } = await supabase
          .from('guests')
          .select('name, email, phone')
          .eq('id', data.guest_id)
          .single();
        
        result.guest = guestData;
      }
      
      if (data.room_id) {
        const { data: roomData } = await supabase
          .from('rooms')
          .select('number, type')
          .eq('id', data.room_id)
          .single();
        
        result.room = roomData;
      }
      
      if (data.organization_id) {
        const { data: orgData } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', data.organization_id)
          .single();
        
        result.organization = orgData;
      }

      return result;
    },
    enabled: open && !!bookingId,
  });

  // Fetch payments for this booking
  const { data: payments } = useQuery({
    queryKey: ['booking-payments', bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('booking_id', bookingId)
        .eq('status', 'completed')
        .is('metadata->refunded', null);

      if (error) throw error;
      return data || [];
    },
    enabled: open && !!bookingId,
  });

  // Calculate cancellation details
  const daysUntilCheckIn = booking 
    ? differenceInDays(new Date(booking.check_in), new Date())
    : 0;

  const totalPaid = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

  const getRefundAmount = () => {
    if (refundPolicy === 'no_refund') return 0;
    if (refundPolicy === 'full_refund') return totalPaid;
    if (refundPolicy === 'custom') return (totalPaid * customRefundPercent) / 100;
    
    // Partial refund based on days until check-in
    if (daysUntilCheckIn >= 7) return totalPaid; // Full refund if 7+ days
    if (daysUntilCheckIn >= 3) return totalPaid * 0.5; // 50% if 3-6 days
    if (daysUntilCheckIn >= 1) return totalPaid * 0.25; // 25% if 1-2 days
    return 0; // No refund if same day
  };

  const refundAmount = getRefundAmount();
  const cancellationFee = totalPaid - refundAmount;

  const cancelMutation = useMutation({
    mutationFn: async () => {
      // Early exit if already cancelled
      if (booking?.status === 'cancelled') {
        throw new Error('Booking is already cancelled');
      }
      
      if (!cancellationReason.trim()) {
        throw new Error('Please provide a reason for cancellation');
      }

      // Update booking status to cancelled
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          metadata: {
            ...(typeof booking?.metadata === 'object' ? booking.metadata : {}),
            cancelled_at: new Date().toISOString(),
            cancelled_by: user?.id,
            cancellation_reason: cancellationReason,
            cancellation_policy: refundPolicy,
            refund_amount: refundAmount,
            cancellation_fee: cancellationFee,
          },
        })
        .eq('id', bookingId);

      if (bookingError) throw bookingError;

      // Process refunds if applicable
      if (refundAmount > 0 && payments && payments.length > 0) {
        // Create refund payment records
        for (const payment of payments) {
          const paymentAmount = Number(payment.amount);
          const refundForThisPayment = (paymentAmount / totalPaid) * refundAmount;

          if (refundForThisPayment > 0) {
            const { error: refundError } = await supabase
              .from('payments')
              .insert({
                tenant_id: payment.tenant_id,
                booking_id: bookingId,
                guest_id: payment.guest_id,
                organization_id: payment.organization_id,
                amount: -refundForThisPayment,
                expected_amount: -refundForThisPayment,
                payment_type: 'refund',
                method: payment.method,
                status: 'completed',
                transaction_ref: `CANCEL-REFUND-${payment.transaction_ref || Date.now()}`,
                recorded_by: user?.id,
                department: payment.department,
                metadata: {
                  original_payment_id: payment.id,
                  refund_reason: 'Booking cancellation',
                  cancellation_reason: cancellationReason,
                  refund_policy: refundPolicy,
                  refunded_at: new Date().toISOString(),
                },
              });

            if (refundError) throw refundError;

            // Reverse wallet transaction if applicable
            if (payment.wallet_id) {
              await supabase.from('wallet_transactions').insert({
                tenant_id: payment.tenant_id,
                wallet_id: payment.wallet_id,
                type: 'debit',
                amount: refundForThisPayment,
                description: `Refund for cancelled booking`,
                created_by: user?.id,
                department: payment.department,
                metadata: {
                  refund: true,
                  cancellation: true,
                  original_payment_id: payment.id,
                  booking_id: bookingId,
                  reason: cancellationReason,
                },
              });
            }
          }
        }
      }

      // Update room status back to available if it was reserved/occupied
      if (booking?.room_id && ['reserved', 'occupied'].includes(booking.status)) {
        const { error: roomError } = await supabase
          .from('rooms')
          .update({ status: 'available' })
          .eq('id', booking.room_id);

        if (roomError) throw roomError;
      }

      // Log the cancellation
      await supabase.from('hotel_audit_logs').insert({
        tenant_id: tenantId,
        table_name: 'bookings',
        record_id: bookingId,
        action: 'cancel',
        user_id: user?.id,
        before_data: { status: booking?.status },
        after_data: {
          status: 'cancelled',
          cancellation_reason: cancellationReason,
          refund_amount: refundAmount,
        },
      });
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['room-detail'] });
      queryClient.invalidateQueries({ queryKey: ['rooms-grid'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      
      toast.success(
        refundAmount > 0
          ? `Booking cancelled. Refund of ₦${refundAmount.toLocaleString()} processed.`
          : 'Booking cancelled successfully'
      );

      // Send cancellation SMS
      try {
        const { data: smsSettings } = await supabase
          .from('tenant_sms_settings')
          .select('enabled, auto_send_cancellation')
          .eq('tenant_id', tenantId)
          .maybeSingle();

        if (smsSettings?.enabled && smsSettings?.auto_send_cancellation && booking?.guest?.phone) {
          const { data: hotelMeta } = await supabase
            .from('hotel_configurations')
            .select('value')
            .eq('tenant_id', tenantId)
            .eq('key', 'hotel_name')
            .maybeSingle();

          const hotelName = hotelMeta?.value || 'Hotel';
          const refundMessage = refundAmount > 0 
            ? `Refund of ₦${refundAmount.toLocaleString()} will be processed.` 
            : '';
          const message = `Your booking (Ref: ${booking.booking_reference}) at ${hotelName} has been cancelled. ${refundMessage}`;

          const { data: { session } } = await supabase.auth.getSession();

          supabase.functions.invoke('send-sms', {
            headers: {
              Authorization: `Bearer ${session?.access_token}`,
            },
            body: {
              tenant_id: tenantId,
              to: booking.guest.phone,
              message,
              event_key: 'booking_cancelled',
              booking_id: bookingId,
              guest_id: booking.guest_id,
            },
          }).then(({ error: smsError }) => {
            if (smsError) {
              console.error('Failed to send cancellation SMS:', smsError);
            } else {
              console.log('Cancellation SMS sent successfully');
            }
          });
        }
      } catch (smsError) {
        console.error('Cancellation SMS error:', smsError);
      }

      onClose();
    },
    onError: (error: Error) => {
      toast.error(`Failed to cancel booking: ${error.message}`);
    },
  });

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cancel Booking</DialogTitle>
          <DialogDescription>
            Review the booking details and select a cancellation policy. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-destructive" />
            <DialogTitle>Cancel Booking</DialogTitle>
          </div>
          <DialogDescription>
            Cancel this booking and process refunds according to the cancellation policy.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Booking Info */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1 text-sm">
                <p><strong>Guest:</strong> {booking?.guest?.name}</p>
                <p><strong>Room:</strong> {booking?.room?.number}</p>
                <p><strong>Check-in:</strong> {booking?.check_in ? format(new Date(booking.check_in), 'PPP') : 'N/A'}</p>
                <p><strong>Days until check-in:</strong> {daysUntilCheckIn} days</p>
                <p><strong>Total Paid:</strong> ₦{totalPaid.toLocaleString()}</p>
              </div>
            </AlertDescription>
          </Alert>

          <Separator />

          {/* Cancellation Policy */}
          <div className="space-y-3">
            <Label>Refund Policy *</Label>
            <RadioGroup value={refundPolicy} onValueChange={(v) => setRefundPolicy(v as CancellationPolicy)}>
              <div className="flex items-start space-x-2">
                <RadioGroupItem value="full_refund" id="full" />
                <div className="space-y-1">
                  <Label htmlFor="full" className="font-normal cursor-pointer">
                    Full Refund (100%)
                  </Label>
                  <p className="text-sm text-muted-foreground">Refund the entire amount paid</p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <RadioGroupItem value="partial_refund" id="partial" />
                <div className="space-y-1">
                  <Label htmlFor="partial" className="font-normal cursor-pointer">
                    Standard Policy (Based on notice period)
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    7+ days: 100% • 3-6 days: 50% • 1-2 days: 25% • Same day: 0%
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <RadioGroupItem value="no_refund" id="none" />
                <div className="space-y-1">
                  <Label htmlFor="none" className="font-normal cursor-pointer">
                    No Refund
                  </Label>
                  <p className="text-sm text-muted-foreground">No refund will be processed</p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <RadioGroupItem value="custom" id="custom" />
                <div className="space-y-2 flex-1">
                  <Label htmlFor="custom" className="font-normal cursor-pointer">
                    Custom Refund Percentage
                  </Label>
                  {refundPolicy === 'custom' && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={customRefundPercent}
                        onChange={(e) => setCustomRefundPercent(Number(e.target.value))}
                        className="w-20 px-3 py-2 border rounded-md"
                      />
                      <span className="text-sm">%</span>
                    </div>
                  )}
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Refund Summary */}
          <Alert className="bg-muted/30">
            <DollarSign className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total Paid:</span>
                  <span className="font-medium">₦{totalPaid.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Refund Amount:</span>
                  <span className="font-medium text-green-600">₦{refundAmount.toLocaleString()}</span>
                </div>
                {cancellationFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Cancellation Fee:</span>
                    <span className="font-medium text-destructive">₦{cancellationFee.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>

          {/* Cancellation Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Cancellation *</Label>
            <Textarea
              id="reason"
              placeholder="Explain why this booking is being cancelled..."
              rows={4}
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
            />
            {!cancellationReason && (
              <p className="text-sm text-muted-foreground">Required field</p>
            )}
          </div>

          {/* Warning */}
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> This action cannot be undone. The booking will be permanently cancelled
              and the room will become available again.
            </AlertDescription>
          </Alert>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={cancelMutation.isPending}
            >
              Keep Booking
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!cancelMutation.isPending) {
                  cancelMutation.mutate();
                }
              }}
              className="flex-1"
              disabled={cancelMutation.isPending || !cancellationReason.trim()}
            >
              {cancelMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Cancel Booking
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
