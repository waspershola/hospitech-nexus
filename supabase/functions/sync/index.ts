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

    const { action_id, type, payload } = await req.json();

    console.log('Syncing offline action:', action_id, 'type:', type);

    switch (type) {
      case 'booking': {
        // Forward to create-booking function
        const bookingResponse = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/create-booking`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({ ...payload, action_id }),
          }
        );

        const bookingResult = await bookingResponse.json();
        return new Response(
          JSON.stringify(bookingResult),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'payment': {
        // Create payment record
        const { data: payment, error } = await supabaseClient
          .from('payments')
          .insert([{
            ...payload,
            metadata: {
              ...payload.metadata,
              offline_action_id: action_id,
              synced_at: new Date().toISOString(),
            }
          }])
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, payment }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'room_status': {
        // Update room status
        const { data: room, error } = await supabaseClient
          .from('rooms')
          .update({ status: payload.status })
          .eq('id', payload.room_id)
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, room }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Unknown action type' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }

  } catch (error) {
    console.error('Error in sync function:', error);
    
    // Sanitize error message for client
    let errorMessage = 'An error occurred processing your request';
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('not found')) errorMessage = 'Resource not found';
      else if (msg.includes('permission') || msg.includes('violates')) errorMessage = 'Permission denied';
    }
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
