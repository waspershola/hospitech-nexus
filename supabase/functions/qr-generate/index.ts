import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// PHASE-5A-VALIDATION: Zod schemas for QR code management
const qrCodeBaseSchema = z.object({
  scope: z.enum(['room', 'location', 'facility', 'event'], {
    errorMap: () => ({ message: "Scope must be one of: room, location, facility, event" })
  }),
  assigned_to: z.string().min(1, 'Assigned to field is required').max(200, 'Assigned to field too long'),
  room_id: z.string().uuid('Invalid room ID format').optional().nullable(),
  services: z.array(z.string()).min(1, 'At least one service must be selected').max(50, 'Too many services selected'),
  display_name: z.string().max(200, 'Display name too long').optional(),
  welcome_message: z.string().max(1000, 'Welcome message too long').optional(),
  expires_at: z.string().datetime({ message: 'Invalid datetime format' }).or(z.literal('')).optional().nullable(),
});

const createQRSchema = z.object({
  action: z.literal('create'),
  qr_codes: z.array(qrCodeBaseSchema).min(1, 'At least one QR code required').max(100, 'Too many QR codes (max 100)'),
});

const updateQRSchema = z.object({
  action: z.literal('update'),
  qr_id: z.string().uuid('Invalid QR code ID'),
  updates: qrCodeBaseSchema.partial(),
});

const deleteQRSchema = z.object({
  action: z.literal('delete'),
  qr_id: z.string().uuid('Invalid QR code ID'),
});

interface QRCodeRequest {
  scope: 'room' | 'location' | 'facility' | 'event';
  assigned_to: string;
  room_id?: string | null;
  services: string[];
  display_name?: string;
  welcome_message?: string;
  expires_at?: string | null;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      console.error('[qr-generate] No Authorization header provided');
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized - No auth token provided' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Extract JWT token from Authorization header
    const token = authHeader.replace('Bearer ', '');

    // Verify user authentication by passing token explicitly
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('[qr-generate] Authentication failed:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { action } = body;

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
      // PHASE-5A-VALIDATION: Validate create payload with Zod
      const validationResult = createQRSchema.safeParse(body);
      
      if (!validationResult.success) {
        const errors = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        console.error('[qr-generate] Create validation failed:', errors);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Invalid QR code data',
            details: errors,
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { qr_codes } = validationResult.data;

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
        
        // Handle duplicate room QR code error
        if (insertError.code === '23505' && insertError.message.includes('unique_room_qr')) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'A QR code already exists for this room. Please update the existing QR code or delete it first.' 
            }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
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
      // PHASE-5A-VALIDATION: Validate update payload with Zod
      const validationResult = updateQRSchema.safeParse(body);
      
      if (!validationResult.success) {
        const errors = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        console.error('[qr-generate] Update validation failed:', errors);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Invalid update data',
            details: errors,
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { qr_id, updates } = validationResult.data;

      console.log('[qr-generate] Updating QR code:', qr_id);

      // QR-EDIT-FIX-V1: Sanitize updates - convert empty strings to null for timestamp fields
      const sanitizedUpdates = { ...updates };
      if (sanitizedUpdates.expires_at === '') {
        sanitizedUpdates.expires_at = null;
      }

      const { data: updatedQR, error: updateError } = await supabase
        .from('qr_codes')
        .update({
          ...sanitizedUpdates,
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
      // PHASE-5A-VALIDATION: Validate delete payload with Zod
      const validationResult = deleteQRSchema.safeParse(body);
      
      if (!validationResult.success) {
        const errors = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        console.error('[qr-generate] Delete validation failed:', errors);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Invalid delete request',
            details: errors,
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { qr_id } = validationResult.data;

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
