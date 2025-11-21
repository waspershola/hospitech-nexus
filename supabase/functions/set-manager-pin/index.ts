/**
 * set-manager-pin Edge Function
 * Version: 1.0.0 - PIN-MANAGEMENT-V1
 * Allows staff to set their manager PIN for the first time
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.1';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const setPinSchema = z.object({
  pin: z.string().regex(/^\d{6}$/, 'PIN must be exactly 6 digits'),
  confirm_pin: z.string().regex(/^\d{6}$/, 'Confirm PIN must be exactly 6 digits'),
}).refine((data) => data.pin === data.confirm_pin, {
  message: 'PINs do not match',
  path: ['confirm_pin'],
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔐 [SET-PIN-V1] Request received');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    console.log('[SET-PIN-V1] Auth header present:', !!authHeader);
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    console.log('[SET-PIN-V1] User authenticated:', !!user, 'Error:', authError?.message);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate request
    const body = await req.json();
    console.log('[SET-PIN-V1] Request body received');
    
    const validationResult = setPinSchema.safeParse(body);

    if (!validationResult.success) {
      console.error('[SET-PIN-V1] Validation failed:', validationResult.error.errors);
      return new Response(
        JSON.stringify({ 
          error: validationResult.error.errors[0].message 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { pin } = validationResult.data;
    console.log('[SET-PIN-V1] PIN validated successfully');

    // Fetch staff record
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('id, tenant_id, manager_pin_hash, role')
      .eq('user_id', user.id)
      .single();

    console.log('[SET-PIN-V1] Staff record found:', !!staff, 'Error:', staffError?.message);

    if (staffError || !staff) {
      return new Response(
        JSON.stringify({ error: 'Staff record not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if PIN already set
    if (staff.manager_pin_hash) {
      console.log('[SET-PIN-V1] PIN already set for staff');
      return new Response(
        JSON.stringify({ error: 'PIN already set. Use "Change PIN" to update your PIN.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Hash PIN with bcrypt (synchronous to avoid Worker issues in edge runtime)
    console.log('[SET-PIN-V1] Hashing PIN (sync)...');
    const hashedPin = bcrypt.hashSync(pin);
    console.log('[SET-PIN-V1] PIN hashed successfully');

    // Store hashed PIN
    const { error: updateError } = await supabase
      .from('staff')
      .update({
        manager_pin_hash: hashedPin,
        pin_set_at: new Date().toISOString(),
        pin_last_changed: new Date().toISOString(),
        pin_attempts: 0,
        pin_locked_until: null
      })
      .eq('id', staff.id);

    if (updateError) {
      console.error('[SET-PIN-V1] Update failed:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to set PIN' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[SET-PIN-V1] ✅ PIN set successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Manager PIN set successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[SET-PIN-V1] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
