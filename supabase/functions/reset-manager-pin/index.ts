/**
 * reset-manager-pin Edge Function
 * Version: 1.0.0 - PIN-MANAGEMENT-V1
 * Allows owners/managers to reset another staff member's PIN
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.1';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resetPinSchema = z.object({
  staff_id: z.string().uuid('Invalid staff ID'),
});

// Only these roles can reset PINs
const AUTHORIZED_ROLES = ['owner', 'manager'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔓 [RESET-PIN-V1] Request received');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate request
    const body = await req.json();
    const validationResult = resetPinSchema.safeParse(body);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ 
          error: validationResult.error.errors[0].message 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { staff_id } = validationResult.data;

    // Fetch requesting user's staff record
    const { data: requestingStaff, error: requestingStaffError } = await supabase
      .from('staff')
      .select('id, tenant_id, role')
      .eq('user_id', user.id)
      .single();

    if (requestingStaffError || !requestingStaff) {
      return new Response(
        JSON.stringify({ error: 'Staff record not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check authorization
    if (!AUTHORIZED_ROLES.includes(requestingStaff.role)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions. Only owners and managers can reset PINs.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch target staff record
    const { data: targetStaff, error: targetStaffError } = await supabase
      .from('staff')
      .select('id, tenant_id, full_name')
      .eq('id', staff_id)
      .single();

    if (targetStaffError || !targetStaff) {
      return new Response(
        JSON.stringify({ error: 'Target staff member not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify same tenant
    if (targetStaff.tenant_id !== requestingStaff.tenant_id) {
      return new Response(
        JSON.stringify({ error: 'Cannot reset PIN for staff in different tenant' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Reset PIN
    const { error: updateError } = await supabase
      .from('staff')
      .update({
        manager_pin_hash: null,
        pin_set_at: null,
        pin_last_changed: null,
        pin_attempts: 0,
        pin_locked_until: null
      })
      .eq('id', staff_id);

    if (updateError) {
      console.error('[RESET-PIN-V1] Update failed:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to reset PIN' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[RESET-PIN-V1] ✅ PIN reset for ${targetStaff.full_name}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `PIN reset successfully for ${targetStaff.full_name}. They must set a new PIN before approving transactions.`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[RESET-PIN-V1] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
