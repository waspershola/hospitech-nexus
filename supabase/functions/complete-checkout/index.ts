import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { bookingId, staffId, autoChargeToWallet = false } = await req.json();

    console.log('[complete-checkout] Starting checkout for booking:', bookingId);

    // 1. Get booking details with room and guest
    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .select(`
        *,
        room:rooms!bookings_room_id_fkey(*),
        guest:guests(*)
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError) {
      console.error('[complete-checkout] Booking fetch error:', bookingError);
      throw bookingError;
    }
    
    if (!booking) {
      throw new Error('Booking not found');
    }

    console.log('[complete-checkout] Booking status:', booking.status);

    // Check if already checked out (idempotency)
    if (booking.status === 'completed' || booking.status === 'checked_out') {
      console.log('[complete-checkout] Already checked out');
      return new Response(
        JSON.stringify({ 
          success: true, 
          note: 'already-checked-out', 
          booking 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Calculate outstanding balance
    const { data: payments } = await supabaseClient
      .from('payments')
      .select('amount, status, charged_to_organization')
      .eq('booking_id', bookingId);

    const successfulPayments = payments?.filter(p => p.status === 'completed' || p.status === 'success') || [];
    const totalPaid = successfulPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const balanceDue = Number(booking.total_amount || 0) - totalPaid;
    const hasOrgPayment = successfulPayments.some(p => p.charged_to_organization);

    console.log('[complete-checkout] Balance calculation:', {
      total: booking.total_amount,
      paid: totalPaid,
      due: balanceDue,
      has_org_payment: hasOrgPayment,
      payments_count: successfulPayments.length
    });

    // 3. Get payment preferences
    const { data: preferences } = await supabaseClient
      .from('hotel_payment_preferences')
      .select('*')
      .eq('tenant_id', booking.tenant_id)
      .maybeSingle();

    const allowCheckoutWithDebt = preferences?.allow_checkout_with_debt ?? false;

    // 4. Handle outstanding balance
    // CRITICAL: Organization bookings with successful org payments should be allowed to checkout
    if (balanceDue > 0.01) { // Use 0.01 threshold for floating point precision
      if (hasOrgPayment && booking.organization_id) {
        // Organization booking with existing payment - allow checkout
        console.log('[complete-checkout] Organization booking with payment - proceeding with checkout');
      } else if (autoChargeToWallet && booking.organization_id) {
        // Auto-charge remaining balance to organization wallet
        console.log('[complete-checkout] Auto-charging balance to organization wallet');
        
        const { data: wallet } = await supabaseClient
          .from('wallets')
          .select('id')
          .eq('owner_id', booking.organization_id)
          .eq('wallet_type', 'organization')
          .single();
        
        if (!wallet) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'WALLET_NOT_FOUND', 
              balanceDue,
              message: 'Organization wallet not found'
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
              status: 400 
            }
          );
        }
        
        // Create payment for remaining balance
        const { data: balancePayment, error: paymentError } = await supabaseClient
          .from('payments')
          .insert({
            tenant_id: booking.tenant_id,
            booking_id: bookingId,
            guest_id: booking.guest_id,
            organization_id: booking.organization_id,
            wallet_id: wallet.id,
            amount: balanceDue,
            expected_amount: balanceDue,
            payment_type: 'full',
            method: 'organization_wallet',
            status: 'completed',
            charged_to_organization: true,
            department: 'front_desk',
            transaction_ref: `CHK-${Date.now()}-${bookingId.substring(0, 8)}`,
            recorded_by: staffId,
            metadata: {
              booking_id: bookingId,
              auto_checkout_charge: true,
              created_at: new Date().toISOString()
            }
          })
          .select()
          .single();
        
        if (paymentError) {
          console.error('[complete-checkout] Failed to create balance payment:', paymentError);
          throw paymentError;
        }
        
        // Create wallet transaction
        const { error: txnError } = await supabaseClient
          .from('wallet_transactions')
          .insert({
            tenant_id: booking.tenant_id,
            wallet_id: wallet.id,
            type: 'debit',
            amount: balanceDue,
            payment_id: balancePayment.id,
            description: `Checkout balance charge - Booking ${bookingId.substring(0, 8)}`,
            created_by: staffId,
            department: 'front_desk',
            metadata: {
              booking_id: bookingId,
              auto_checkout_charge: true,
            }
          });
        
        if (txnError) {
          console.error('[complete-checkout] Failed to create wallet transaction:', txnError);
          throw txnError;
        }
        
        console.log('[complete-checkout] Balance charged to organization wallet');
      } else if (allowCheckoutWithDebt) {
        // Create receivable for outstanding balance
        console.log('[complete-checkout] Creating receivable for outstanding balance');
        
        const { error: receivableError } = await supabaseClient
          .from('receivables')
          .insert({
            tenant_id: booking.tenant_id,
            guest_id: booking.guest_id,
            organization_id: booking.organization_id,
            booking_id: bookingId,
            amount: balanceDue,
            status: 'open',
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            created_by: staffId,
            metadata: {
              booking_id: bookingId,
              checkout_balance: true,
              original_total: booking.total_amount,
              total_paid: totalPaid,
            }
          });
        
        if (receivableError) {
          console.error('[complete-checkout] Failed to create receivable:', receivableError);
          throw receivableError;
        }
        
        console.log('[complete-checkout] Receivable created, allowing checkout with debt');
      } else {
        // Regular guest booking with outstanding balance - block checkout
        console.log('[complete-checkout] Outstanding balance detected - blocking checkout');
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'BALANCE_DUE', 
            balanceDue,
            message: 'Outstanding balance must be settled before checkout'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
            status: 400 
          }
        );
      }
    }

    // 5. Update booking status to completed
    const { error: updateBookingError } = await supabaseClient
      .from('bookings')
      .update({
        status: 'completed',
        metadata: {
          ...(booking.metadata || {}),
          actual_checkout: new Date().toISOString(),
          checked_out_by: staffId,
        }
      })
      .eq('id', bookingId);

    if (updateBookingError) {
      console.error('[complete-checkout] Booking update error:', updateBookingError);
      throw updateBookingError;
    }

    console.log('[complete-checkout] Booking marked as completed');

    // 6. Update room - set to cleaning and clear guest references
    const { error: updateRoomError } = await supabaseClient
      .from('rooms')
      .update({
        status: 'cleaning',
        housekeeping_status: 'needs_cleaning',
        current_reservation_id: null,
        current_guest_id: null,
      })
      .eq('id', booking.room_id);

    if (updateRoomError) {
      console.error('[complete-checkout] Room update error:', updateRoomError);
      throw updateRoomError;
    }

    console.log('[complete-checkout] Room status updated to cleaning');

    // 7. Create audit log
    await supabaseClient.from('hotel_audit_logs').insert({
      tenant_id: booking.tenant_id,
      user_id: staffId,
      action: 'CHECKOUT_COMPLETED',
      table_name: 'bookings',
      record_id: bookingId,
      after_data: { 
        booking_id: bookingId, 
        room_id: booking.room_id, 
        status: 'completed',
        balance_due: balanceDue 
      }
    });

    console.log('[complete-checkout] Checkout completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        booking,
        balanceDue,
        message: 'Checkout completed successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[complete-checkout] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    );
  }
});
