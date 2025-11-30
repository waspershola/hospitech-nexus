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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // This function should be called via cron job
    const { tenant_id, hours_before = 24 } = await req.json();

    if (!tenant_id) {
      return new Response(JSON.stringify({ error: 'Missing tenant_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[send-checkin-reminder] Starting for tenant: ${tenant_id}, ${hours_before}h before`);

    // Check if auto-send check-in reminders is enabled
    const { data: smsSettings } = await supabase
      .from('tenant_sms_settings')
      .select('enabled, auto_send_checkin_reminder')
      .eq('tenant_id', tenant_id)
      .maybeSingle();

    if (!smsSettings?.enabled || !smsSettings?.auto_send_checkin_reminder) {
      console.log('[send-checkin-reminder] Check-in reminders disabled for tenant');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Check-in reminders disabled',
        sent: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate time window for check-ins (24 hours from now ± 1 hour)
    const now = new Date();
    const targetTime = new Date(now.getTime() + hours_before * 60 * 60 * 1000);
    const windowStart = new Date(targetTime.getTime() - 60 * 60 * 1000); // 1 hour before
    const windowEnd = new Date(targetTime.getTime() + 60 * 60 * 1000);   // 1 hour after

    console.log('[send-checkin-reminder] Time window:', {
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
    });

    // Query bookings with check-in in the time window
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        id,
        check_in,
        guest:guests!guest_id(id, name, phone),
        room:rooms!room_id(id, category:room_categories!room_category_id(name))
      `)
      .eq('tenant_id', tenant_id)
      .in('status', ['reserved', 'confirmed'])
      .gte('check_in', windowStart.toISOString())
      .lte('check_in', windowEnd.toISOString());

    if (bookingsError) {
      console.error('[send-checkin-reminder] Error fetching bookings:', bookingsError);
      throw bookingsError;
    }

    console.log(`[send-checkin-reminder] Found ${bookings?.length || 0} bookings`);

    if (!bookings || bookings.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No bookings to send reminders for',
        sent: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch hotel name
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', tenant_id)
      .single();

    const hotelName = tenant?.name || 'Hotel';

    let sentCount = 0;
    let failedCount = 0;

    // Send SMS to each guest
    for (const booking of bookings) {
      const guest = Array.isArray(booking.guest) ? booking.guest[0] : booking.guest;
      const room = Array.isArray(booking.room) ? booking.room[0] : booking.room;

      if (!guest?.phone) {
        console.log(`[send-checkin-reminder] No phone for booking ${booking.id}`);
        failedCount++;
        continue;
      }

      const guestName = guest.name;
      const category = Array.isArray(room?.category) ? room?.category[0] : room?.category;
      const roomCategory = category?.name || 'your room';
      const checkInDate = new Date(booking.check_in).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });

      const message = `Hi ${guestName}, reminder: Your check-in at ${hotelName} is tomorrow (${checkInDate}). Your ${roomCategory} will be ready. See you soon!`;

      try {
        const { data: smsResult, error: smsError } = await supabase.functions.invoke('send-sms', {
          body: {
            tenant_id,
            to: guest.phone,
            message,
            event_key: 'checkin_reminder',
            booking_id: booking.id,
            guest_id: guest.id,
          },
        });

        if (smsError) {
          console.error(`[send-checkin-reminder] SMS failed for booking ${booking.id}:`, smsError);
          failedCount++;
        } else {
          console.log(`[send-checkin-reminder] SMS sent for booking ${booking.id}`);
          sentCount++;
        }
      } catch (error) {
        console.error(`[send-checkin-reminder] Error sending SMS for booking ${booking.id}:`, error);
        failedCount++;
      }

      // Add delay between SMS to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`[send-checkin-reminder] Completed: ${sentCount} sent, ${failedCount} failed`);

    return new Response(JSON.stringify({
      success: true,
      sent: sentCount,
      failed: failedCount,
      total: bookings.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[send-checkin-reminder] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
