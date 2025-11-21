/**
 * validate-manager-pin Edge Function
 * Version: 1.0.0 - PIN-VALIDATION-V1
 * Validates manager PIN for high-risk financial operations
 * Implements rate limiting (3 attempts → 15min lockout)
 * Generates short-lived approval tokens (10min expiry)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.1';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
// Use bcryptjs (pure JS) instead of bcrypt (which relies on Worker API not available in Edge runtime)
import bcrypt from 'https://esm.sh/bcryptjs@2.4.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation schema
const validatePinSchema = z.object({
  pin: z.string().regex(/^\d{6}$/, 'PIN must be exactly 6 digits'),
  action_type: z.enum([
    'overpayment',
    'underpayment',
    'rebate',
    'force_cancel',
    'write_off',
    'refund',
    'transfer_charge',
    'split_charge',
    'merge_folio',
    'reverse_transaction',
    'stock_adjustment',
    'checkout_with_debt',
    'manual_rate_override',
    'room_rebate' // Backward compatibility alias for 'rebate'
  ]),
  action_reference: z.string().uuid().optional().nullable(),
  amount: z.number().positive().optional().nullable(),
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(500, 'Reason too long'),
});

// Authorized roles for approvals
const AUTHORIZED_ROLES = ['owner', 'manager', 'finance_manager', 'accounting'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔒 [PIN-VALIDATION-V1] Request received');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // ========== Step 1: Authenticate User ==========
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[PIN-VALIDATION-V1] No authorization header');
      return new Response(
        JSON.stringify({ 
          valid: false,
          error: 'UNAUTHORIZED',
          message: 'Authentication required'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('[PIN-VALIDATION-V1] Auth failed:', authError);
      return new Response(
        JSON.stringify({ 
          valid: false,
          error: 'UNAUTHORIZED',
          message: 'Invalid authentication token'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[PIN-VALIDATION-V1] User authenticated: ${user.id}`);

    // ========== Step 2: Validate Request Body ==========
    const requestBody = await req.json();
    const validationResult = validatePinSchema.safeParse(requestBody);

    if (!validationResult.success) {
      console.error('[PIN-VALIDATION-V1] Validation failed:', validationResult.error);
      return new Response(
        JSON.stringify({
          valid: false,
          error: 'INVALID_REQUEST',
          message: 'Invalid request format',
          details: validationResult.error.format()
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { pin, action_type: rawActionType, action_reference, amount, reason } = validationResult.data;
    
    // Normalize 'room_rebate' to 'rebate' for internal use (backward compatibility)
    const action_type = rawActionType === 'room_rebate' ? 'rebate' : rawActionType;
    
    console.log(`[PIN-VALIDATION-V1] Action type: received="${rawActionType}", normalized="${action_type}"`);

    // ========== Step 3: Fetch Staff Record ==========
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('id, tenant_id, full_name, role, manager_pin_hash, pin_attempts, pin_locked_until')
      .eq('user_id', user.id)
      .single();

    if (staffError || !staff) {
      console.error('[PIN-VALIDATION-V1] Staff not found:', staffError);
      return new Response(
        JSON.stringify({
          valid: false,
          error: 'STAFF_NOT_FOUND',
          message: 'Staff record not found'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[PIN-VALIDATION-V1] Staff found: ${staff.id} (Role: ${staff.role})`);

    // ========== Step 4: Check Role Authorization ==========
    if (!AUTHORIZED_ROLES.includes(staff.role)) {
      console.error(`[PIN-VALIDATION-V1] Unauthorized role: ${staff.role}`);
      
      // Log failed attempt
      await supabase.from('approval_logs').insert({
        tenant_id: staff.tenant_id,
        approver_id: staff.id,
        action_type,
        action_reference,
        amount,
        reason,
        pin_valid: false,
        pin_attempts: 1,
        metadata: { 
          error: 'INSUFFICIENT_PERMISSIONS',
          user_role: staff.role 
        }
      });

      return new Response(
        JSON.stringify({
          valid: false,
          error: 'INSUFFICIENT_PERMISSIONS',
          message: `Only managers and owners can approve this action. Your role: ${staff.role}`,
          required_roles: AUTHORIZED_ROLES
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== Step 5: Check if PIN is Set ==========
    if (!staff.manager_pin_hash) {
      console.error('[PIN-VALIDATION-V1] PIN not set');
      return new Response(
        JSON.stringify({
          valid: false,
          error: 'PIN_NOT_SET',
          message: 'Manager PIN has not been set. Please set your PIN in Settings before approving transactions.'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== Step 6: Check Account Lockout ==========
    const now = new Date();
    const lockedUntil = staff.pin_locked_until ? new Date(staff.pin_locked_until) : null;

    if (lockedUntil && lockedUntil > now) {
      const minutesRemaining = Math.ceil((lockedUntil.getTime() - now.getTime()) / 60000);
      console.error(`[PIN-VALIDATION-V1] Account locked until ${lockedUntil.toISOString()}`);
      
      return new Response(
        JSON.stringify({
          valid: false,
          error: 'ACCOUNT_LOCKED',
          message: `Account locked for ${minutesRemaining} more minute(s) due to multiple failed PIN attempts`,
          locked_until: lockedUntil.toISOString()
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Reset attempts if lockout expired
    if (lockedUntil && lockedUntil <= now) {
      console.log('[PIN-VALIDATION-V1] Lockout expired, resetting attempts');
      await supabase
        .from('staff')
        .update({ 
          pin_attempts: 0,
          pin_locked_until: null 
        })
        .eq('id', staff.id);
      
      staff.pin_attempts = 0;
    }

    // ========== Step 7: Validate PIN using BCrypt (via bcryptjs) ==========
    console.log('[PIN-VALIDATION-V1] Validating PIN...');
    const isValidPin = await bcrypt.compare(pin, staff.manager_pin_hash);

    if (!isValidPin) {
      // Increment failed attempts
      const newAttempts = (staff.pin_attempts || 0) + 1;
      const attemptsRemaining = 3 - newAttempts;
      
      console.error(`[PIN-VALIDATION-V1] Invalid PIN (Attempt ${newAttempts}/3)`);

      // Lock account after 3 failed attempts
      if (newAttempts >= 3) {
        const lockUntil = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes
        await supabase
          .from('staff')
          .update({ 
            pin_attempts: newAttempts,
            pin_locked_until: lockUntil.toISOString()
          })
          .eq('id', staff.id);

        // Log failed attempt with lockout
        await supabase.from('approval_logs').insert({
          tenant_id: staff.tenant_id,
          approver_id: staff.id,
          action_type,
          action_reference,
          amount,
          reason,
          pin_valid: false,
          pin_attempts: newAttempts,
          metadata: { 
            error: 'ACCOUNT_LOCKED',
            locked_until: lockUntil.toISOString()
          }
        });

        return new Response(
          JSON.stringify({
            valid: false,
            error: 'ACCOUNT_LOCKED',
            message: 'Account locked for 15 minutes due to 3 failed PIN attempts',
            locked_until: lockUntil.toISOString()
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update attempts (not locked yet)
      await supabase
        .from('staff')
        .update({ pin_attempts: newAttempts })
        .eq('id', staff.id);

      // Log failed attempt
      await supabase.from('approval_logs').insert({
        tenant_id: staff.tenant_id,
        approver_id: staff.id,
        action_type,
        action_reference,
        amount,
        reason,
        pin_valid: false,
        pin_attempts: newAttempts,
        metadata: { 
          error: 'INVALID_PIN',
          attempts_remaining: attemptsRemaining
        }
      });

      return new Response(
        JSON.stringify({
          valid: false,
          error: 'INVALID_PIN',
          message: `Incorrect PIN. ${attemptsRemaining} attempt(s) remaining.`,
          attempts_remaining: attemptsRemaining
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== Step 8: PIN Valid - Generate Approval Token ==========
    console.log('[PIN-VALIDATION-V1] ✅ PIN valid, generating approval token');

    // Reset failed attempts on success
    await supabase
      .from('staff')
      .update({ 
        pin_attempts: 0,
        pin_locked_until: null
      })
      .eq('id', staff.id);

    // Generate approval token via RPC
    const { data: approvalToken, error: tokenError } = await supabase
      .rpc('generate_approval_token', {
        p_approver_id: staff.id,
        p_tenant_id: staff.tenant_id,
        p_action_type: action_type,
        p_action_reference: action_reference || null,
        p_amount: amount || null
      });

    if (tokenError || !approvalToken) {
      console.error('[PIN-VALIDATION-V1] Token generation failed:', tokenError);
      return new Response(
        JSON.stringify({
          valid: false,
          error: 'TOKEN_GENERATION_FAILED',
          message: 'Failed to generate approval token'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes

    // Log successful approval
    await supabase.from('approval_logs').insert({
      tenant_id: staff.tenant_id,
      approver_id: staff.id,
      action_type,
      action_reference,
      amount,
      reason,
      pin_valid: true,
      pin_attempts: 1,
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      user_agent: req.headers.get('user-agent'),
      metadata: { 
        success: true,
        token_expires_at: expiresAt.toISOString()
      }
    });

    console.log('[PIN-VALIDATION-V1] ✅ Success - Token generated');

    return new Response(
      JSON.stringify({
        valid: true,
        approval_token: approvalToken,
        approver: {
          id: staff.id,
          name: staff.full_name,
          role: staff.role
        },
        expires_at: expiresAt.toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[PIN-VALIDATION-V1] ❌ Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        valid: false,
        error: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        details: errorMessage
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
