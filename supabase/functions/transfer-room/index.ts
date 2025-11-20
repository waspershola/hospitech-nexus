import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// TRANSFER-ROOM-V1: Transfer guest to different room with folio updates
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[transfer-room] TRANSFER-ROOM-V1: Processing room transfer');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('[transfer-room] TRANSFER-ROOM-V1: Authentication failed');
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { booking_id, new_room_id, reason, staff_id } = await req.json();

    console.log('[transfer-room] TRANSFER-ROOM-V1: Request payload:', {
      booking_id,
      new_room_id,
      reason
    });

    if (!booking_id || !new_room_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: booking_id and new_room_id are required' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch current booking
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select('*, room:rooms!bookings_room_id_fkey(number, status), guest:guests(name)')
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      console.error('[transfer-room] TRANSFER-ROOM-V1: Booking not found:', bookingError);
      return new Response(
        JSON.stringify({ success: false, error: 'Booking not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[transfer-room] TRANSFER-ROOM-V1: Current booking:', {
      id: booking.id,
      status: booking.status,
      old_room_id: booking.room_id,
      tenant_id: booking.tenant_id
    });

    const oldRoomId = booking.room_id;

    // Fetch target room
    const { data: newRoom, error: newRoomError } = await supabaseAdmin
      .from('rooms')
      .select('*')
      .eq('id', new_room_id)
      .eq('tenant_id', booking.tenant_id)
      .single();

    if (newRoomError || !newRoom) {
      console.error('[transfer-room] TRANSFER-ROOM-V1: Target room not found:', newRoomError);
      return new Response(
        JSON.stringify({ success: false, error: 'Target room not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check target room availability
    if (booking.status === 'checked_in') {
      const { data: conflicts, error: conflictError } = await supabaseAdmin
        .from('bookings')
        .select('id')
        .eq('room_id', new_room_id)
        .eq('tenant_id', booking.tenant_id)
        .neq('id', booking_id)
        .in('status', ['reserved', 'checked_in']);

      if (conflictError) {
        console.error('[transfer-room] TRANSFER-ROOM-V1: Error checking conflicts:', conflictError);
      } else if (conflicts && conflicts.length > 0) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Target room is not available (already occupied or reserved)' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Update booking with new room
    const metadata = booking.metadata as any || {};
    const { error: updateBookingError } = await supabaseAdmin
      .from('bookings')
      .update({
        room_id: new_room_id,
        metadata: {
          ...metadata,
          room_transfers: [
            ...(metadata.room_transfers || []),
            {
              transferred_at: new Date().toISOString(),
              transferred_by: staff_id || user.id,
              old_room_id: oldRoomId,
              new_room_id: new_room_id,
              reason: reason || 'Guest request'
            }
          ]
        }
      })
      .eq('id', booking_id)
      .eq('tenant_id', booking.tenant_id);

    if (updateBookingError) {
      console.error('[transfer-room] TRANSFER-ROOM-V1: Error updating booking:', updateBookingError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to update booking: ${updateBookingError.message}` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update room statuses if booking is checked-in
    if (booking.status === 'checked_in') {
      // Old room to cleaning
      await supabaseAdmin
        .from('rooms')
        .update({ status: 'cleaning' })
        .eq('id', oldRoomId)
        .eq('tenant_id', booking.tenant_id);

      // New room to occupied
      await supabaseAdmin
        .from('rooms')
        .update({ status: 'occupied' })
        .eq('id', new_room_id)
        .eq('tenant_id', booking.tenant_id);

      console.log('[transfer-room] TRANSFER-ROOM-V1: Room statuses updated');

      // Update folio room_id if folio exists
      const { data: folio } = await supabaseAdmin
        .from('stay_folios')
        .select('id')
        .eq('booking_id', booking_id)
        .eq('tenant_id', booking.tenant_id)
        .eq('status', 'open')
        .maybeSingle();

      if (folio) {
        await supabaseAdmin
          .from('stay_folios')
          .update({ room_id: new_room_id })
          .eq('id', folio.id)
          .eq('tenant_id', booking.tenant_id);

        console.log('[transfer-room] TRANSFER-ROOM-V1: Folio room_id updated');
      }
    }

    // Log audit event
    await supabaseAdmin.from('hotel_audit_logs').insert({
      tenant_id: booking.tenant_id,
      table_name: 'bookings',
      record_id: booking_id,
      action: 'transfer_room',
      user_id: staff_id || user.id,
      before_data: {
        room_id: oldRoomId
      },
      after_data: {
        room_id: new_room_id,
        reason: reason
      }
    });

    console.log('[transfer-room] TRANSFER-ROOM-V1: Transfer completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Room transferred successfully',
        data: {
          booking_id,
          old_room_id: oldRoomId,
          new_room_id: new_room_id,
          new_room_number: newRoom.number
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[transfer-room] TRANSFER-ROOM-V1: Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        stack: errorStack
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
