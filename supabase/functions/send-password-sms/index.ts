import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

interface SendPasswordSMSRequest {
  phone: string;
  password: string;
  user_name: string;
  user_type?: 'platform_user' | 'tenant_user';
  user_id?: string;
  delivered_by?: string;
}

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
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const { phone, password, user_name, user_type = 'tenant_user', user_id, delivered_by }: SendPasswordSMSRequest = await req.json();

    if (!phone || !password || !user_name) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: phone, password, user_name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📱 Sending password SMS:', { phone, user_name, user_type });

    // Format phone number (ensure it starts with +)
    const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;

    // Construct SMS message
    const message = `Hi ${user_name}, your temporary password is: ${password}. Please log in and change it immediately. - Hotel Management System`;

    // Get Termii API key from environment
    const termiiApiKey = Deno.env.get('TERMII_API_KEY');
    if (!termiiApiKey) {
      throw new Error('TERMII_API_KEY not configured');
    }

    // Send SMS using Termii API
    const response = await fetch('https://api.ng.termii.com/api/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: formattedPhone,
        from: 'HotelMgmt',
        sms: message,
        type: 'plain',
        channel: 'generic',
        api_key: termiiApiKey,
      }),
    });

    const responseData = await response.json();
    const success = response.ok && responseData.message_id;

    console.log('📤 SMS response:', { success, status: response.status, data: responseData });

    // Log delivery attempt if user_id provided
    if (user_id) {
      await supabase.from('password_delivery_log').insert({
        user_id,
        delivery_method: 'sms',
        delivered_by: delivered_by || null,
        delivery_status: success ? 'sent' : 'failed',
        error_message: success ? null : (responseData.message || 'SMS delivery failed'),
        metadata: {
          phone: formattedPhone,
          user_type,
          provider: 'termii',
          message_id: responseData.message_id || null,
        },
      });
    }

    if (!success) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: responseData.message || 'SMS delivery failed' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message_id: responseData.message_id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ SMS error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
