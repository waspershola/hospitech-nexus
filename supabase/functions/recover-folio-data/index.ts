import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { tenant_id } = await req.json()

    if (!tenant_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'tenant_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[recover-folio] Starting data recovery for tenant:', tenant_id)

    const results = {
      folios_created: 0,
      charges_posted: 0,
      failed_folios: [] as Array<{ booking_id: string; error: string }>,
      failed_charges: [] as Array<{ folio_id: string; error: string }>,
    }

    // Step 1: Find checked-in bookings without folios
    const { data: bookingsWithoutFolios, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, room_id, guest_id, total_amount, booking_reference, status')
      .eq('tenant_id', tenant_id)
      .eq('status', 'checked_in')

    if (bookingsError) throw bookingsError

    console.log('[recover-folio] Found bookings:', bookingsWithoutFolios?.length || 0)

    for (const booking of bookingsWithoutFolios || []) {
      // Check if folio exists
      const { data: existingFolio } = await supabase
        .from('stay_folios')
        .select('id')
        .eq('booking_id', booking.id)
        .eq('status', 'open')
        .maybeSingle()

      if (!existingFolio) {
        // Create missing folio
        console.log('[recover-folio] Creating folio for booking:', booking.id)
        const { data: newFolio, error: folioError } = await supabase
          .from('stay_folios')
          .insert({
            tenant_id,
            booking_id: booking.id,
            room_id: booking.room_id,
            guest_id: booking.guest_id,
            total_charges: 0,
            balance: 0,
            metadata: {
              created_by_recovery: true,
              booking_reference: booking.booking_reference
            }
          })
          .select()
          .single()

        if (folioError) {
          console.error('[recover-folio] Failed to create folio:', folioError)
          results.failed_folios.push({
            booking_id: booking.id,
            error: folioError.message
          })
          continue
        }

        results.folios_created++
        console.log('[recover-folio] Folio created:', newFolio.id)
      }
    }

    // Step 2: Post missing charges to folios with total_charges = 0
    const { data: emptyFolios, error: emptyFoliosError } = await supabase
      .from('stay_folios')
      .select('id, booking_id, total_charges')
      .eq('tenant_id', tenant_id)
      .eq('status', 'open')
      .eq('total_charges', 0)

    if (emptyFoliosError) throw emptyFoliosError

    console.log('[recover-folio] Found folios with zero charges:', emptyFolios?.length || 0)

    for (const folio of emptyFolios || []) {
      // Get booking amount
      const { data: booking } = await supabase
        .from('bookings')
        .select('total_amount, booking_reference')
        .eq('id', folio.booking_id)
        .single()

      if (!booking || !booking.total_amount || booking.total_amount === 0) {
        console.log('[recover-folio] Skipping folio - no booking amount:', folio.id)
        continue
      }

      // Post charge using RPC
      console.log('[recover-folio] Posting charge to folio:', folio.id, 'Amount:', booking.total_amount)
      const { data: chargeResult, error: chargeError } = await supabase.rpc('folio_post_charge', {
        p_folio_id: folio.id,
        p_amount: booking.total_amount,
        p_description: `Accommodation charges (${booking.booking_reference}) - Recovery`,
        p_reference_type: 'booking',
        p_reference_id: booking.id,
        p_department: 'front_desk'
      })

      if (chargeError || !chargeResult?.success) {
        console.error('[recover-folio] Failed to post charge:', chargeError || chargeResult)
        results.failed_charges.push({
          folio_id: folio.id,
          error: chargeError?.message || chargeResult?.error || 'Unknown error'
        })
      } else {
        results.charges_posted++
        console.log('[recover-folio] Charge posted successfully')
      }
    }

    console.log('[recover-folio] Recovery complete:', results)

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        message: `Created ${results.folios_created} folios, posted ${results.charges_posted} charges`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[recover-folio] Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
