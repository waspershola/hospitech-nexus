import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReceiptRequest {
  payment_id: string;
  tenant_id: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { payment_id, tenant_id } = await req.json() as ReceiptRequest;

    console.log('[generate-payment-receipt] Generating receipt for payment:', payment_id);

    // 1. Fetch payment details with ledger entries
    const { data: payment, error: paymentError } = await supabase
      .from('platform_fee_payments')
      .select('*')
      .eq('id', payment_id)
      .single();

    if (paymentError || !payment) {
      throw new Error('Payment not found');
    }

    const { data: ledgerEntries, error: ledgerError } = await supabase
      .from('platform_fee_ledger')
      .select('*')
      .in('id', payment.ledger_ids);

    if (ledgerError) {
      throw new Error(`Failed to fetch ledger entries: ${ledgerError.message}`);
    }

    // 2. Fetch tenant details
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', tenant_id)
      .single();

    if (tenantError) {
      console.error('[generate-payment-receipt] Tenant fetch error:', tenantError);
    }

    // 3. Generate receipt content (HTML format)
    const receiptDate = new Date(payment.settled_at || payment.created_at);
    const formattedDate = receiptDate.toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const receiptHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
    .info { margin: 20px 0; }
    .info-row { display: flex; justify-content: space-between; margin: 10px 0; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background-color: #f5f5f5; font-weight: bold; }
    .total { font-size: 1.2em; font-weight: bold; text-align: right; margin-top: 20px; }
    .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Platform Fee Payment Receipt</h1>
    <p>Receipt #${payment.payment_reference}</p>
  </div>
  
  <div class="info">
    <div class="info-row">
      <span><strong>Tenant:</strong> ${tenant?.name || 'N/A'}</span>
      <span><strong>Date:</strong> ${formattedDate}</span>
    </div>
    <div class="info-row">
      <span><strong>Payment Method:</strong> ${payment.provider?.toUpperCase()}</span>
      <span><strong>Status:</strong> PAID</span>
    </div>
  </div>

  <h3>Fee Details</h3>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Type</th>
        <th>Description</th>
        <th>Amount (₦)</th>
      </tr>
    </thead>
    <tbody>
      ${ledgerEntries?.map(entry => `
        <tr>
          <td>${new Date(entry.created_at).toLocaleDateString()}</td>
          <td>${entry.reference_type}</td>
          <td>${entry.fee_type} fee (${entry.billing_cycle})</td>
          <td>${Number(entry.fee_amount).toLocaleString()}</td>
        </tr>
      `).join('') || ''}
    </tbody>
  </table>

  <div class="total">
    Total Paid: ₦${Number(payment.total_amount).toLocaleString()}
  </div>

  <div class="footer">
    <p>Thank you for your payment</p>
    <p>This is an automatically generated receipt</p>
  </div>
</body>
</html>
    `;

    console.log('[generate-payment-receipt] Receipt HTML generated');

    // 4. TODO: Phase 5 - Generate PDF and upload to storage
    // For now, store HTML in payment metadata
    const { error: updateError } = await supabase
      .from('platform_fee_payments')
      .update({
        metadata: {
          ...payment.metadata,
          receipt_html: receiptHtml,
          receipt_generated_at: new Date().toISOString()
        }
      })
      .eq('id', payment_id);

    if (updateError) {
      console.error('[generate-payment-receipt] Error storing receipt:', updateError);
    }

    // 5. TODO: Phase 5 - Send email with receipt using Resend
    // For now, just log success
    console.log('[generate-payment-receipt] Receipt generated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        payment_id,
        receipt_reference: payment.payment_reference,
        message: 'Receipt generated successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[generate-payment-receipt] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate receipt';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
