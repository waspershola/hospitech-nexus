import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QuotaAlertCheck {
  tenant_id: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { tenant_id } = await req.json() as QuotaAlertCheck;

    if (!tenant_id) {
      throw new Error('Missing tenant_id parameter');
    }

    // Get alert settings
    const { data: alertSettings, error: settingsError } = await supabase
      .from('tenant_sms_alert_settings')
      .select('*')
      .eq('tenant_id', tenant_id)
      .maybeSingle();

    if (settingsError) throw settingsError;

    // If alerts are disabled or no settings exist, return early
    if (!alertSettings || !alertSettings.alert_enabled) {
      return new Response(
        JSON.stringify({ message: 'Alerts disabled', checked: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current quota
    const { data: quota, error: quotaError } = await supabase
      .from('tenant_sms_quota')
      .select('*')
      .eq('tenant_id', tenant_id)
      .maybeSingle();

    if (quotaError) throw quotaError;

    if (!quota) {
      return new Response(
        JSON.stringify({ message: 'No quota found', checked: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const remaining = quota.quota_total - quota.quota_used;
    const percentRemaining = (remaining / quota.quota_total) * 100;
    
    let shouldAlert = false;
    let alertType = '';

    // Check if we should send alert
    if (alertSettings.alert_threshold_absolute && remaining <= alertSettings.alert_threshold_absolute) {
      shouldAlert = true;
      alertType = 'absolute';
    } else if (percentRemaining <= alertSettings.alert_threshold_percent) {
      shouldAlert = true;
      alertType = 'percentage';
    }

    if (!shouldAlert) {
      return new Response(
        JSON.stringify({ 
          message: 'Quota above threshold', 
          checked: true,
          remaining,
          percentRemaining: Math.round(percentRemaining)
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if we already sent an alert recently (within 24 hours)
    if (alertSettings.last_alert_sent_at) {
      const lastAlertTime = new Date(alertSettings.last_alert_sent_at).getTime();
      const now = new Date().getTime();
      const hoursSinceLastAlert = (now - lastAlertTime) / (1000 * 60 * 60);
      
      if (hoursSinceLastAlert < 24) {
        return new Response(
          JSON.stringify({ 
            message: 'Alert already sent recently',
            checked: true,
            lastAlertSent: alertSettings.last_alert_sent_at
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get hotel info for notification
    const { data: hotelMeta } = await supabase
      .from('hotel_meta')
      .select('hotel_name')
      .eq('tenant_id', tenant_id)
      .single();

    const hotelName = hotelMeta?.hotel_name || 'Your Hotel';

    // Prepare notification message
    const message = `SMS Credit Alert: ${hotelName} has ${remaining} credits remaining (${Math.round(percentRemaining)}% of quota). Please purchase more credits to avoid service interruption.`;

    const recipients = alertSettings.alert_recipients as string[] || [];
    let notificationsSent = 0;

    // Send email notifications
    if (alertSettings.notify_email && recipients.length > 0) {
      // Email notifications would go here
      // For now, we'll just log it
      console.log('Would send email to:', recipients);
      notificationsSent++;
    }

    // Send SMS notifications (if configured)
    if (alertSettings.notify_sms && recipients.length > 0) {
      for (const phone of recipients) {
        try {
          const smsResult = await supabase.functions.invoke('send-sms', {
            body: {
              tenant_id,
              to: phone,
              message: message.substring(0, 160), // Trim to fit SMS length
              event_key: 'quota_alert',
            },
          });

          if (!smsResult.error) {
            notificationsSent++;
          }
        } catch (smsError) {
          console.error('Failed to send SMS alert:', smsError);
        }
      }
    }

    // Log the alert
    await supabase
      .from('tenant_sms_alert_logs')
      .insert({
        tenant_id,
        alert_type: alertType,
        quota_remaining: remaining,
        quota_total: quota.quota_total,
        message,
        recipients: alertSettings.alert_recipients,
      });

    // Update last alert sent timestamp
    await supabase
      .from('tenant_sms_alert_settings')
      .update({ last_alert_sent_at: new Date().toISOString() })
      .eq('id', alertSettings.id);

    return new Response(
      JSON.stringify({
        success: true,
        alert_sent: true,
        notifications_sent: notificationsSent,
        remaining,
        percentRemaining: Math.round(percentRemaining),
        message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in check-sms-quota-alerts:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
