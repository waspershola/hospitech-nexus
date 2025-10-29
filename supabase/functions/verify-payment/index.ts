import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Sanitize error messages to prevent information leakage
function sanitizeError(error: unknown): string {
  if (error instanceof Error) {
    console.error('Full error (server-side only):', error);
    
    // Return generic messages that don't expose internals
    const message = error.message.toLowerCase();
    if (message.includes('violates') || message.includes('permission')) return 'Permission denied';
    if (message.includes('not found') || message.includes('does not exist')) return 'Resource not found';
    if (message.includes('invalid') || message.includes('malformed')) return 'Invalid request';
    
    return 'An error occurred processing your request';
  }
  return 'Unknown error';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { payment_id, provider_reference } = await req.json();

    if (!payment_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Payment ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Verifying payment:', payment_id, 'by user:', user.id);

    // Get the payment record
    const { data: payment, error: fetchError } = await supabaseClient
      .from('payments')
      .select('*, tenant_id')
      .eq('id', payment_id)
      .single();

    if (fetchError) {
      return new Response(
        JSON.stringify({ success: false, error: sanitizeError(fetchError) }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user belongs to the payment's tenant
    const { data: userRole } = await supabaseClient
      .from('user_roles')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .single();

    if (!userRole || userRole.tenant_id !== payment.tenant_id) {
      console.warn('Unauthorized payment verification attempt:', { user_id: user.id, payment_id, payment_tenant: payment.tenant_id });
      return new Response(
        JSON.stringify({ success: false, error: 'Permission denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has manager or owner role (payment verification is a sensitive operation)
    const hasPermission = userRole.role === 'owner' || userRole.role === 'manager';
    if (!hasPermission) {
      console.warn('Insufficient role for payment verification:', { user_id: user.id, role: userRole.role });
      return new Response(
        JSON.stringify({ success: false, error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Simulate payment verification
    // In production, replace with actual provider API call
    const verificationResult = {
      verified: true,
      status: 'paid',
      provider_reference: provider_reference || `VER-${Date.now()}`,
      verified_at: new Date().toISOString(),
    };

    // Update payment status
    const { data: updatedPayment, error: updateError } = await supabaseClient
      .from('payments')
      .update({
        status: verificationResult.status,
        provider_reference: verificationResult.provider_reference,
        metadata: {
          ...payment.metadata,
          verified_at: verificationResult.verified_at,
          verified_by: user.id,
          verification_result: verificationResult,
        }
      })
      .eq('id', payment_id)
      .select()
      .single();

    if (updateError) {
      return new Response(
        JSON.stringify({ success: false, error: sanitizeError(updateError) }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Payment verified successfully:', payment_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        payment: updatedPayment,
        verification: verificationResult 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in verify-payment function:', error);
    return new Response(
      JSON.stringify({ success: false, error: sanitizeError(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
