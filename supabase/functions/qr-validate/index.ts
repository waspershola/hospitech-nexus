import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { token } = await req.json();

    if (!token || typeof token !== 'string' || token.trim() === '') {
      console.error('[qr-validate] Invalid token format');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid token format' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('[qr-validate] Validating token:', token.substring(0, 8) + '...');

    // Call the database function to validate token
    const { data, error } = await supabase.rpc('validate_qr_token', {
      _token: token.trim()
    });

    if (error) {
      console.error('[qr-validate] Database error:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to validate token' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!data || data.length === 0) {
      console.log('[qr-validate] Token not found or expired');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid or expired QR code' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const qrData = data[0];
    console.log('[qr-validate] Token validated successfully for tenant:', qrData.tenant_id);

    // Fetch tenant branding for portal customization
    const { data: branding } = await supabase
      .from('hotel_branding')
      .select('primary_color, logo_url, favicon_url')
      .eq('tenant_id', qrData.tenant_id)
      .single();

    // Fetch tenant meta for contact info
    const { data: meta } = await supabase
      .from('hotel_meta')
      .select('hotel_name, contact_phone, contact_email')
      .eq('tenant_id', qrData.tenant_id)
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          qr_id: qrData.qr_id,
          tenant_id: qrData.tenant_id,
          room_id: qrData.room_id,
          assigned_to: qrData.assigned_to,
          display_name: qrData.display_name || qrData.assigned_to,
          welcome_message: qrData.welcome_message || 'Welcome! How can we help you today?',
          scope: qrData.scope,
          services: qrData.services || [],
          branding: branding || {},
          tenant: meta || {}
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[qr-validate] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
