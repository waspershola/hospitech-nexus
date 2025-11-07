import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendPasswordSMSRequest {
  phone: string;
  password: string;
  user_name: string;
  user_type: 'platform_user' | 'tenant_user';
  hotel_name?: string;
  user_id?: string;
  delivered_by?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body: SendPasswordSMSRequest = await req.json();
    const { phone, password, user_name, user_type, hotel_name, user_id, delivered_by } = body;

    // Validate inputs
    if (!phone || !password || !user_name) {
      return new Response(
        JSON.stringify({ success: false, error: 'Phone, password, and user_name are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format phone number (ensure it starts with +)
    const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;

    // Compose SMS message
    const organizationName = hotel_name || 'Platform Admin';
    const message = `Hi ${user_name},\n\nYour temporary password: ${password}\n\nYou must change this password on your next login.\n\n- ${organizationName}`;

    // Check message length (max 160 chars for single SMS)
    if (message.length > 160) {
      console.warn(`SMS message is ${message.length} chars (will use ${Math.ceil(message.length / 160)} segments)`);
    }

    // Call SMS provider (Termii)
    // Note: This assumes SMS settings are configured globally
    // In production, fetch tenant-specific SMS settings
    const termiiApiKey = Deno.env.get('TERMII_API_KEY');
    
    if (!termiiApiKey) {
      console.error('TERMII_API_KEY not configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'SMS provider not configured. Please contact support.' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send SMS via Termii
    const termiiResponse = await fetch('https://api.ng.termii.com/api/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: termiiApiKey,
        to: formattedPhone,
        from: 'HotelPro',
        sms: message,
        type: 'plain',
        channel: 'generic',
      }),
    });

    const termiiData = await termiiResponse.json();

    // Log delivery attempt
    if (user_id) {
      const logData: any = {
        user_id,
        delivery_method: 'sms',
        delivered_at: new Date().toISOString(),
        delivery_status: termiiData.message_id ? 'sent' : 'failed',
        metadata: {
          phone: formattedPhone,
          provider: 'termii',
          message_id: termiiData.message_id,
          segments: Math.ceil(message.length / 160),
        },
      };

      if (delivered_by) {
        logData.delivered_by = delivered_by;
      }

      if (!termiiData.message_id) {
        logData.error_message = termiiData.message || 'Unknown SMS error';
      }

      await supabase.from('password_delivery_log').insert(logData);
    }

    if (!termiiData.message_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: termiiData.message || 'Failed to send SMS',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Password sent via SMS',
        message_id: termiiData.message_id,
        segments: Math.ceil(message.length / 160),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('SMS delivery error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
