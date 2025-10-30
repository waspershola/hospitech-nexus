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
        room:rooms(*),
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
      .select('amount, status')
      .eq('booking_id', bookingId)
      .eq('status', 'success');

    const totalPaid = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
    const balanceDue = Number(booking.total_amount || 0) - totalPaid;

    console.log('[complete-checkout] Balance calculation:', {
      total: booking.total_amount,
      paid: totalPaid,
      due: balanceDue
    });

    // 3. Handle outstanding balance
    if (balanceDue > 0 && !autoChargeToWallet) {
      console.log('[complete-checkout] Outstanding balance detected');
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

    // 4. Update booking status to completed
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

    // 5. Update room - set to cleaning and clear guest references
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

    // 6. Create audit log
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
