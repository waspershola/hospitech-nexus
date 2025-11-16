import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { tenant_id, dry_run = true } = await req.json();

    if (!tenant_id) {
      throw new Error('tenant_id is required');
    }

    console.log(`[backfill] Starting folio backfill for tenant ${tenant_id} (dry_run: ${dry_run})`);

    // Find all checked-in bookings without folios
    const { data: bookingsWithoutFolios, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        *,
        guest:guests(*),
        room:rooms!bookings_room_id_fkey(*)
      `)
      .eq('tenant_id', tenant_id)
      .in('status', ['confirmed', 'checked_in'])
      .is('metadata->folio_id', null);

    if (bookingsError) throw bookingsError;

    console.log(`[backfill] Found ${bookingsWithoutFolios?.length || 0} bookings without folios`);

    const results = {
      processed: 0,
      created_folios: 0,
      linked_charges: 0,
      linked_payments: 0,
      errors: [] as any[],
      folios: [] as any[]
    };

    for (const booking of bookingsWithoutFolios || []) {
      try {
        console.log(`[backfill] Processing booking ${booking.id} - ${booking.booking_reference}`);

        // Check if folio already exists
        const { data: existingFolio } = await supabase
          .from('stay_folios')
          .select('id')
          .eq('booking_id', booking.id)
          .eq('tenant_id', tenant_id)
          .maybeSingle();

        if (existingFolio) {
          console.log(`[backfill] Folio already exists for booking ${booking.id}`);
          results.processed++;
          continue;
        }

        // Get all charges for this booking
        const { data: charges } = await supabase
          .from('booking_charges')
          .select('*')
          .eq('booking_id', booking.id)
          .eq('tenant_id', tenant_id);

        // Get all payments for this booking
        const { data: payments } = await supabase
          .from('payments')
          .select('*')
          .eq('booking_id', booking.id)
          .eq('tenant_id', tenant_id)
          .eq('status', 'success');

        const totalCharges = charges?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;
        const totalPayments = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
        const balance = totalCharges - totalPayments;

        console.log(`[backfill] Booking ${booking.booking_reference}: ${charges?.length || 0} charges (${totalCharges}), ${payments?.length || 0} payments (${totalPayments}), balance: ${balance}`);

        if (!dry_run) {
          // Create the folio
          const { data: newFolio, error: folioError } = await supabase
            .from('stay_folios')
            .insert({
              tenant_id,
              booking_id: booking.id,
              room_id: booking.room_id,
              guest_id: booking.guest_id,
              status: 'open',
              balance,
              total_charges: totalCharges,
              total_payments: totalPayments,
              metadata: {
                backfilled: true,
                backfilled_at: new Date().toISOString(),
                booking_reference: booking.booking_reference,
                guest_name: booking.guest?.name,
                room_number: booking.room?.number
              }
            })
            .select()
            .single();

          if (folioError) {
            console.error(`[backfill] Error creating folio for booking ${booking.id}:`, folioError);
            results.errors.push({
              booking_id: booking.id,
              booking_reference: booking.booking_reference,
              error: folioError.message
            });
            continue;
          }

          console.log(`[backfill] Created folio ${newFolio.id} for booking ${booking.booking_reference}`);
          results.created_folios++;

          // Post existing payments to folio using folio_post_payment RPC
          if (payments && payments.length > 0) {
            console.log(`[backfill] Posting ${payments.length} payments to folio ${newFolio.id}`);
            for (const payment of payments) {
              try {
                console.log(`[backfill] Calling folio_post_payment with:`, {
                  p_folio_id: newFolio.id,
                  p_payment_id: payment.id,
                  p_amount: Number(payment.amount)
                });
                
                const { data: postResult, error: paymentPostError } = await supabaseServiceClient.rpc('folio_post_payment', {
                  p_folio_id: newFolio.id,
                  p_payment_id: payment.id,
                  p_amount: Number(payment.amount)
                });
                
                if (paymentPostError) {
                  console.error(`[backfill] Failed to post payment ${payment.id}:`, paymentPostError);
                } else {
                  console.log(`[backfill] Payment ${payment.id} posted successfully:`, postResult);
                  results.linked_payments++;
                }
              } catch (err) {
                console.error(`[backfill] Error posting payment ${payment.id}:`, err);
              }
            }
          }

          // Link existing requests to folio
          const { error: requestsLinkError } = await supabase
            .from('requests')
            .update({ stay_folio_id: newFolio.id })
            .eq('room_id', booking.room_id)
            .eq('tenant_id', tenant_id)
            .is('stay_folio_id', null);
          
          if (requestsLinkError) {
            console.error(`[backfill] Failed to link requests:`, requestsLinkError);
          } else {
            console.log(`[backfill] Linked requests to folio`);
          }

          // Link all charges to the folio
          if (charges && charges.length > 0) {
            const { error: chargesUpdateError } = await supabase
              .from('booking_charges')
              .update({ stay_folio_id: newFolio.id })
              .eq('booking_id', booking.id)
              .eq('tenant_id', tenant_id);

            if (chargesUpdateError) {
              console.error(`[backfill] Error linking charges:`, chargesUpdateError);
            } else {
              results.linked_charges += charges.length;
              console.log(`[backfill] Linked ${charges.length} charges to folio`);
            }
          }

          // Update booking metadata with folio_id
          const { error: bookingUpdateError } = await supabase
            .from('bookings')
            .update({
              metadata: {
                ...booking.metadata,
                folio_id: newFolio.id,
                folio_created_at: new Date().toISOString()
              }
            })
            .eq('id', booking.id);

          if (bookingUpdateError) {
            console.error(`[backfill] Error updating booking metadata:`, bookingUpdateError);
          }

          results.folios.push({
            folio_id: newFolio.id,
            booking_id: booking.id,
            booking_reference: booking.booking_reference,
            guest_name: booking.guest?.name,
            room_number: booking.room?.number,
            total_charges: totalCharges,
            total_payments: totalPayments,
            balance,
            linked_charges: charges?.length || 0,
            linked_payments: payments?.length || 0
          });
        } else {
          // Dry run - just record what would happen
          results.folios.push({
            booking_id: booking.id,
            booking_reference: booking.booking_reference,
            guest_name: booking.guest?.name,
            room_number: booking.room?.number,
            total_charges: totalCharges,
            total_payments: totalPayments,
            balance,
            charges_to_link: charges?.length || 0,
            payments_to_link: payments?.length || 0
          });
        }

        results.processed++;
      } catch (error) {
        console.error(`[backfill] Error processing booking ${booking.id}:`, error);
        results.errors.push({
          booking_id: booking.id,
          booking_reference: booking.booking_reference,
          error: error.message
        });
      }
    }

    console.log(`[backfill] Backfill complete:`, results);

    return new Response(
      JSON.stringify({
        success: true,
        dry_run,
        message: dry_run 
          ? `Dry run complete. Would create ${results.processed} folios.`
          : `Backfill complete. Created ${results.created_folios} folios, linked ${results.linked_charges} charges and ${results.linked_payments} payments.`,
        results
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('[backfill] Fatal error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
