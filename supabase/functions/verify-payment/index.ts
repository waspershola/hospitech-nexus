import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { payment_id, provider_reference } = await req.json();

    console.log('Verifying payment:', payment_id);

    // In production, this would call the actual payment provider API
    // For now, we'll simulate verification
    
    // Get the payment record
    const { data: payment, error: fetchError } = await supabaseClient
      .from('payments')
      .select('*')
      .eq('id', payment_id)
      .single();

    if (fetchError) throw fetchError;

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
          verification_result: verificationResult,
        }
      })
      .eq('id', payment_id)
      .select()
      .single();

    if (updateError) throw updateError;

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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
