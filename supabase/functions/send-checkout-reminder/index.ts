import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CheckoutReminderRequest {
  tenant_id: string;
  hours_before: number; // 24 or 2
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { tenant_id, hours_before } = await req.json() as CheckoutReminderRequest;

    if (!tenant_id || !hours_before) {
      throw new Error('Missing required parameters: tenant_id and hours_before');
    }

    // Check tenant SMS settings for checkout reminders
    const { data: smsSettings } = await supabase
      .from('tenant_sms_settings')
      .select('enabled, auto_send_checkout_reminder')
      .eq('tenant_id', tenant_id)
      .maybeSingle();

    if (!smsSettings?.enabled || !smsSettings?.auto_send_checkout_reminder) {
      console.log('[send-checkout-reminder] Checkout reminders disabled for tenant');
      return new Response(
        JSON.stringify({ message: 'Checkout reminders disabled', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get checkout time from hotel configurations
    const { data: checkoutConfig } = await supabase
      .from('hotel_configurations')
      .select('value')
      .eq('tenant_id', tenant_id)
      .eq('key', 'check_out_time')
      .maybeSingle();

    const checkoutTime = checkoutConfig?.value || '12:00';

    // Calculate target checkout datetime
    const now = new Date();
    const targetDate = new Date(now.getTime() + hours_before * 60 * 60 * 1000);
    const targetDateStr = targetDate.toISOString().split('T')[0];

    // Get hotel meta information
    const { data: hotelMeta } = await supabase
      .from('hotel_meta')
      .select('hotel_name, contact_phone, contact_email')
      .eq('tenant_id', tenant_id)
      .single();

    const hotelName = hotelMeta?.hotel_name || 'Hotel';

    // Get email settings
    const { data: emailSettings } = await supabase
      .from('email_settings')
      .select('from_name, from_email')
      .eq('tenant_id', tenant_id)
      .single();

    const fromEmail = emailSettings?.from_email || 'noreply@hotel.com';
    const fromName = emailSettings?.from_name || hotelName;

    // Get bookings checking out on target date
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        id,
        check_out,
        total_amount,
        room:rooms!bookings_room_id_fkey(id, category:room_categories!room_category_id(name)),
        guest:guests!bookings_guest_id_fkey(id, name, email, phone)
      `)
      .eq('tenant_id', tenant_id)
      .eq('status', 'checked_in')
      .gte('check_out', `${targetDateStr}T00:00:00`)
      .lt('check_out', `${targetDateStr}T23:59:59`);

    if (bookingsError) throw bookingsError;

    if (!bookings || bookings.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No bookings to remind', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let sentCount = 0;
    const errors: string[] = [];

    // Send reminders
    for (const booking of bookings) {
      try {
        const guest = booking.guest as any;
        const room = booking.room as any;

        if (!guest?.email) {
          console.log(`Skipping booking ${booking.id}: No guest email`);
          continue;
        }

        // Get payments to calculate balance
        const { data: payments } = await supabase
          .from('payments')
          .select('amount, status')
          .eq('booking_id', booking.id)
          .eq('status', 'completed');

        const totalPaid = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
        const balance = booking.total_amount - totalPaid;

        const checkoutDate = new Date(booking.check_out);
        const formattedDate = checkoutDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        // Send SMS if guest has phone
        if (guest.phone) {
          try {
            const category = Array.isArray(room?.category) ? room?.category[0] : room?.category;
            const roomCategory = category?.name || 'your room';
            const smsMessage = balance > 0
              ? `Hi ${guest.name}, checkout from ${hotelName} is ${hours_before === 24 ? 'tomorrow' : 'in 2 hours'} at ${checkoutTime}. Outstanding balance: ₦${balance.toLocaleString()}. Safe travels!`
              : `Hi ${guest.name}, checkout from ${hotelName} is ${hours_before === 24 ? 'tomorrow' : 'in 2 hours'} at ${checkoutTime}. Safe travels!`;

            const smsResult = await supabase.functions.invoke('send-sms', {
              body: {
                tenant_id: tenant_id,
                to: guest.phone,
                message: smsMessage,
                event_key: 'checkout_reminder',
                booking_id: booking.id,
                guest_id: guest.id,
              },
            });

            if (smsResult.error) {
              console.error('SMS send error:', smsResult.error);
              errors.push(`SMS failed for ${guest.phone}: ${smsResult.error.message}`);
            } else {
              sentCount++;
              console.log(`Sent SMS reminder to ${guest.phone}`);
              
              // Log usage for analytics
              await supabase.from('tenant_sms_usage_logs').insert({
                tenant_id: tenant_id,
                event_key: 'checkout_reminder',
                recipient: guest.phone,
                message_preview: smsMessage.substring(0, 100),
                status: 'sent',
                booking_id: booking.id,
                guest_id: guest.id,
              });
            }
          } catch (smsError: any) {
            console.error('SMS send error:', smsError);
            errors.push(`SMS failed for ${guest.phone}: ${smsError.message}`);
          }
        }
      } catch (error: any) {
        errors.push(`Error processing booking ${booking.id}: ${error.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        total: bookings.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in send-checkout-reminder:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
