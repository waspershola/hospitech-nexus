import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Resend } from 'npm:resend@4.0.0';
import React from 'npm:react@18.3.1';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import { CheckoutReminderEmail } from './_templates/checkout-reminder.tsx';

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string);

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

    // Get checkout policy settings
    const { data: checkoutPolicy } = await supabase
      .from('hotel_configurations')
      .select('key, value')
      .eq('tenant_id', tenant_id)
      .in('key', [
        'enable_checkout_reminders',
        'reminder_24h',
        'reminder_2h',
        'send_email',
        'send_sms',
        'check_out_time'
      ]);

    const configMap = new Map(checkoutPolicy?.map(c => [c.key, c.value]) || []);
    
    const enableReminders = configMap.get('enable_checkout_reminders') !== false;
    const sendEmail = configMap.get('send_email') !== false;
    const checkReminder = hours_before === 24 
      ? configMap.get('reminder_24h') !== false
      : configMap.get('reminder_2h') !== false;

    if (!enableReminders || !checkReminder || !sendEmail) {
      return new Response(
        JSON.stringify({ message: 'Reminders disabled or not configured', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const checkoutTime = configMap.get('check_out_time') || '12:00';

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
        room:rooms(number),
        guest:guests(name, email)
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

        const html = await renderAsync(
          React.createElement(CheckoutReminderEmail, {
            guestName: guest.name || 'Guest',
            hotelName,
            roomNumber: room?.number || '',
            checkoutDate: formattedDate,
            checkoutTime,
            hoursUntilCheckout: hours_before,
            balance: balance > 0 ? balance : 0,
            currency: '₦',
            hotelPhone: hotelMeta?.contact_phone,
            hotelEmail: hotelMeta?.contact_email,
          })
        );

        const { error: emailError } = await resend.emails.send({
          from: `${fromName} <${fromEmail}>`,
          to: [guest.email],
          subject: `Checkout Reminder - ${hours_before === 24 ? 'Tomorrow' : 'In 2 Hours'} at ${hotelName}`,
          html,
        });

        if (emailError) {
          errors.push(`Failed to send to ${guest.email}: ${emailError.message}`);
        } else {
          sentCount++;
          console.log(`Sent reminder to ${guest.email} for room ${room?.number}`);
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
