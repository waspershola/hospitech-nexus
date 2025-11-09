import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend@4.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailNotificationRequest {
  tenant_id: string;
  to: string;
  event_key: string;
  variables: Record<string, any>;
  booking_id?: string;
  guest_id?: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { tenant_id, to, event_key, variables, booking_id, guest_id }: EmailNotificationRequest = await req.json();

    console.log('[send-email-notification] Request:', { tenant_id, to, event_key });

    if (!to || !to.includes('@')) {
      console.log('[send-email-notification] Invalid or missing email address');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid email address' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Fetch email template (tenant-specific or global)
    const { data: template, error: templateError } = await supabaseClient
      .from('platform_email_templates')
      .select('*')
      .eq('event_key', event_key)
      .eq('is_active', true)
      .or(`tenant_id.eq.${tenant_id},tenant_id.is.null`)
      .order('tenant_id', { ascending: false }) // Tenant-specific first
      .limit(1)
      .maybeSingle();

    if (templateError || !template) {
      console.error('[send-email-notification] Template not found:', templateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Email template not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Fetch hotel metadata for additional context
    const { data: hotelMeta } = await supabaseClient
      .from('hotel_meta')
      .select('hotel_name, contact_phone')
      .eq('tenant_id', tenant_id)
      .maybeSingle();

    const { data: financials } = await supabaseClient
      .from('hotel_financials')
      .select('currency_symbol')
      .eq('tenant_id', tenant_id)
      .maybeSingle();

    // Fetch active email provider
    const { data: provider, error: providerError } = await supabaseClient
      .from('platform_email_providers')
      .select('*')
      .eq('provider_type', 'resend')
      .eq('enabled', true)
      .or(`tenant_id.eq.${tenant_id},tenant_id.is.null`)
      .order('tenant_id', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (providerError || !provider) {
      console.error('[send-email-notification] Email provider not configured:', providerError);
      return new Response(
        JSON.stringify({ success: false, error: 'Email provider not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Prepare template variables with defaults
    const templateVars = {
      hotel_name: hotelMeta?.hotel_name || 'Our Hotel',
      frontdesk_phone: hotelMeta?.contact_phone || 'Contact our frontdesk',
      currency_symbol: financials?.currency_symbol || '₦',
      ...variables,
    };

    // Replace placeholders in subject and body
    let subject = template.subject;
    let bodyHtml = template.body_html;
    let bodyText = template.body_text || '';

    Object.entries(templateVars).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      const replacement = String(value || '');
      subject = subject.replace(new RegExp(placeholder, 'g'), replacement);
      bodyHtml = bodyHtml.replace(new RegExp(placeholder, 'g'), replacement);
      bodyText = bodyText.replace(new RegExp(placeholder, 'g'), replacement);
    });

    // Send email via Resend
    const resend = new Resend(provider.config.apiKey);
    
    // Build sender address
    const senderEmail = provider.config.fromEmail || 'noreply@luxuryhotelpro.com';
    const senderName = hotelMeta?.hotel_name || 'LuxuryHotelPro';
    const fromAddress = `${senderName} <${senderEmail}>`;
    
    const emailResult = await resend.emails.send({
      from: fromAddress,
      to: [to],
      subject: subject,
      html: bodyHtml,
      text: bodyText,
    });

    if (emailResult.error) {
      console.error('[send-email-notification] Resend error:', emailResult.error);
      
      // Log failure
      await supabaseClient.from('tenant_email_usage_logs').insert({
        tenant_id,
        event_key,
        recipient: to,
        subject,
        status: 'failed',
        provider: 'resend',
        error_message: emailResult.error.message,
        booking_id,
        guest_id,
        failed_at: new Date().toISOString(),
      });

      return new Response(
        JSON.stringify({ success: false, error: emailResult.error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('[send-email-notification] Email sent successfully:', emailResult.data);

    // Log success
    await supabaseClient.from('tenant_email_usage_logs').insert({
      tenant_id,
      event_key,
      recipient: to,
      subject,
      status: 'sent',
      provider: 'resend',
      message_id: emailResult.data?.id,
      booking_id,
      guest_id,
      sent_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message_id: emailResult.data?.id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('[send-email-notification] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
