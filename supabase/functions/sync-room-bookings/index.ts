import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { tenant_id } = await req.json();
    
    console.log('Starting room-booking sync for tenant:', tenant_id);

    // Get all rooms for the tenant
    const { data: rooms, error: roomsError } = await supabaseClient
      .from('rooms')
      .select('id, number')
      .eq('tenant_id', tenant_id);

    if (roomsError) throw roomsError;

    const today = new Date().toISOString().split('T')[0];
    const results: {
      total_rooms: number;
      updated: number;
      cleared: number;
      errors: Array<{ room: string; error: string }>;
    } = {
      total_rooms: rooms?.length || 0,
      updated: 0,
      cleared: 0,
      errors: []
    };

    for (const room of rooms || []) {
      try {
        // Priority 1: Currently checked-in booking active today
        const { data: checkedInBooking } = await supabaseClient
          .from('bookings')
          .select('id, guest_id')
          .eq('room_id', room.id)
          .eq('status', 'checked_in')
          .lte('check_in', `${today}T23:59:59`)
          .gt('check_out', today)
          .order('check_in', { ascending: false })
          .limit(1)
          .single();

        if (checkedInBooking) {
          // Update to checked-in booking
          await supabaseClient
            .from('rooms')
            .update({
              status: 'occupied',
              current_reservation_id: checkedInBooking.id,
              current_guest_id: checkedInBooking.guest_id
            })
            .eq('id', room.id);
          
          results.updated++;
          console.log(`Room ${room.number}: Set to checked-in booking ${checkedInBooking.id}`);
          continue;
        }

        // Priority 2: Today's arrival (reserved)
        const { data: todayArrival } = await supabaseClient
          .from('bookings')
          .select('id, guest_id')
          .eq('room_id', room.id)
          .eq('status', 'reserved')
          .eq('check_in', today)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (todayArrival) {
          // Update to today's arrival
          await supabaseClient
            .from('rooms')
            .update({
              status: 'reserved',
              current_reservation_id: todayArrival.id,
              current_guest_id: todayArrival.guest_id
            })
            .eq('id', room.id);
          
          results.updated++;
          console.log(`Room ${room.number}: Set to today's arrival ${todayArrival.id}`);
          continue;
        }

        // No active booking for today - clear references
        const { data: roomData } = await supabaseClient
          .from('rooms')
          .select('status')
          .eq('id', room.id)
          .single();

        if (roomData && !['maintenance', 'out_of_order', 'cleaning'].includes(roomData.status)) {
          await supabaseClient
            .from('rooms')
            .update({
              status: 'available',
              current_reservation_id: null,
              current_guest_id: null
            })
            .eq('id', room.id);
          
          results.cleared++;
          console.log(`Room ${room.number}: Cleared (no active booking today)`);
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error syncing room ${room.number}:`, errorMessage);
        results.errors.push({ room: room.number, error: errorMessage });
      }
    }

    console.log('Sync complete:', results);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Room sync completed',
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in sync-room-bookings:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});