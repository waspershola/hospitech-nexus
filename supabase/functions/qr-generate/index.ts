import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QRCodeRequest {
  scope: 'room' | 'location' | 'table' | 'facility';
  assigned_to: string;
  room_id?: string;
  services: string[];
  display_name?: string;
  welcome_message?: string;
  expires_at?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify user authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[qr-generate] Authentication failed:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { action, qr_codes } = body;

    // Get user's tenant
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .single();

    if (!userRole || !['owner', 'manager'].includes(userRole.role)) {
      console.error('[qr-generate] Insufficient permissions:', userRole?.role);
      return new Response(
        JSON.stringify({ success: false, error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tenantId = userRole.tenant_id;

    if (action === 'create') {
      // Validate request
      if (!Array.isArray(qr_codes) || qr_codes.length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid QR code data' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[qr-generate] Creating ${qr_codes.length} QR code(s) for tenant:`, tenantId);

      // Prepare QR codes for insertion
      const qrDataArray = qr_codes.map((qr: QRCodeRequest) => ({
        tenant_id: tenantId,
        scope: qr.scope,
        assigned_to: qr.assigned_to,
        room_id: qr.room_id || null,
        services: qr.services || [],
        display_name: qr.display_name || qr.assigned_to,
        welcome_message: qr.welcome_message || 'Welcome! Scan to request services or contact our team.',
        status: 'active',
        expires_at: qr.expires_at || null,
      }));

      // Insert QR codes
      const { data: insertedQRs, error: insertError } = await supabase
        .from('qr_codes')
        .insert(qrDataArray)
        .select();

      if (insertError) {
        console.error('[qr-generate] Insert error:', insertError);
        return new Response(
          JSON.stringify({ success: false, error: insertError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[qr-generate] Successfully created ${insertedQRs.length} QR code(s)`);

      return new Response(
        JSON.stringify({
          success: true,
          data: insertedQRs,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (action === 'update') {
      const { qr_id, updates } = body;

      if (!qr_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'QR code ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[qr-generate] Updating QR code:', qr_id);

      const { data: updatedQR, error: updateError } = await supabase
        .from('qr_codes')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', qr_id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (updateError) {
        console.error('[qr-generate] Update error:', updateError);
        return new Response(
          JSON.stringify({ success: false, error: updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[qr-generate] Successfully updated QR code');

      return new Response(
        JSON.stringify({
          success: true,
          data: updatedQR,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (action === 'delete') {
      const { qr_id } = body;

      if (!qr_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'QR code ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[qr-generate] Deleting QR code:', qr_id);

      const { error: deleteError } = await supabase
        .from('qr_codes')
        .delete()
        .eq('id', qr_id)
        .eq('tenant_id', tenantId);

      if (deleteError) {
        console.error('[qr-generate] Delete error:', deleteError);
        return new Response(
          JSON.stringify({ success: false, error: deleteError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[qr-generate] Successfully deleted QR code');

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('[qr-generate] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
