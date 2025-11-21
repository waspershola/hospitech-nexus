/**
 * change-manager-pin Edge Function
 * Version: 1.0.0 - PIN-MANAGEMENT-V1
 * Allows staff to change their existing manager PIN
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.1';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const changePinSchema = z.object({
  old_pin: z.string().regex(/^\d{6}$/, 'Old PIN must be exactly 6 digits'),
  new_pin: z.string().regex(/^\d{6}$/, 'New PIN must be exactly 6 digits'),
  confirm_new_pin: z.string().regex(/^\d{6}$/, 'Confirm PIN must be exactly 6 digits'),
}).refine((data) => data.new_pin === data.confirm_new_pin, {
  message: 'New PINs do not match',
  path: ['confirm_new_pin'],
}).refine((data) => data.old_pin !== data.new_pin, {
  message: 'New PIN must be different from old PIN',
  path: ['new_pin'],
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 [CHANGE-PIN-V1] Request received');

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
    const validationResult = changePinSchema.safeParse(body);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ 
          error: validationResult.error.errors[0].message 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { old_pin, new_pin } = validationResult.data;

    // Fetch staff record
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('id, tenant_id, manager_pin_hash, pin_locked_until')
      .eq('user_id', user.id)
      .single();

    if (staffError || !staff) {
      return new Response(
        JSON.stringify({ error: 'Staff record not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if PIN is set
    if (!staff.manager_pin_hash) {
      return new Response(
        JSON.stringify({ error: 'No PIN set. Use "Set PIN" first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if account is locked
    if (staff.pin_locked_until && new Date(staff.pin_locked_until) > new Date()) {
      return new Response(
        JSON.stringify({ error: 'Account is locked. Please wait before trying again.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify old PIN
    const isValidOldPin = await bcrypt.compare(old_pin, staff.manager_pin_hash);

    if (!isValidOldPin) {
      return new Response(
        JSON.stringify({ error: 'Incorrect old PIN' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Hash new PIN
    const hashedNewPin = await bcrypt.hash(new_pin);

    // Update PIN
    const { error: updateError } = await supabase
      .from('staff')
      .update({
        manager_pin_hash: hashedNewPin,
        pin_last_changed: new Date().toISOString(),
        pin_attempts: 0,
        pin_locked_until: null
      })
      .eq('id', staff.id);

    if (updateError) {
      console.error('[CHANGE-PIN-V1] Update failed:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to change PIN' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[CHANGE-PIN-V1] ✅ PIN changed successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Manager PIN changed successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[CHANGE-PIN-V1] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
