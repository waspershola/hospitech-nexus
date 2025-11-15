import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseServiceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { booking_id } = await req.json()

    if (!booking_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'booking_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get booking details
    const { data: booking, error: bookingError } = await supabaseServiceClient
      .from('bookings')
      .select('*')
      .eq('id', booking_id)
      .single()

    if (bookingError || !booking) {
      console.error('[manual-create-folio] Booking not found:', bookingError)
      return new Response(
        JSON.stringify({ success: false, error: 'Booking not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if folio already exists
    const { data: existingFolio } = await supabaseServiceClient
      .from('stay_folios')
      .select('id')
      .eq('booking_id', booking_id)
      .maybeSingle()

    if (existingFolio) {
      console.log('[manual-create-folio] Folio already exists:', existingFolio.id)
      return new Response(
        JSON.stringify({ success: true, folio: existingFolio, already_exists: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create new folio
    const { data: folio, error: folioError } = await supabaseServiceClient
      .from('stay_folios')
      .insert({
        tenant_id: booking.tenant_id,
        booking_id: booking.id,
        room_id: booking.room_id,
        guest_id: booking.guest_id,
        total_charges: booking.total_amount || 0,
        balance: booking.total_amount || 0,
        status: 'open',
        metadata: {
          manually_created: true,
          created_at: new Date().toISOString(),
          booking_reference: booking.booking_reference
        }
      })
      .select()
      .single()

    if (folioError) {
      console.error('[manual-create-folio] Failed to create folio:', folioError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create folio', details: folioError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[manual-create-folio] Folio created successfully:', folio.id)

    return new Response(
      JSON.stringify({ success: true, folio }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[manual-create-folio] Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
