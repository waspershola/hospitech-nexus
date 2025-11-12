import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    console.log('Starting monthly platform fee billing process...');

    // Get all tenants with pending fees
    const { data: pendingFees, error: feesError } = await supabase
      .from('platform_fee_ledger')
      .select('tenant_id, fee_amount, base_amount')
      .eq('status', 'pending')
      .eq('billing_cycle', 'monthly');

    if (feesError) {
      console.error('Error fetching pending fees:', feesError);
      throw feesError;
    }

    if (!pendingFees || pendingFees.length === 0) {
      console.log('No pending fees to bill');
      return new Response(
        JSON.stringify({ message: 'No pending fees to bill', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Group fees by tenant
    const feesByTenant = pendingFees.reduce((acc, fee) => {
      if (!acc[fee.tenant_id]) {
        acc[fee.tenant_id] = {
          total_fee: 0,
          total_base: 0,
          count: 0
        };
      }
      acc[fee.tenant_id].total_fee += fee.fee_amount;
      acc[fee.tenant_id].total_base += fee.base_amount;
      acc[fee.tenant_id].count += 1;
      return acc;
    }, {} as Record<string, { total_fee: number; total_base: number; count: number }>);

    console.log(`Processing fees for ${Object.keys(feesByTenant).length} tenants`);

    const results = [];

    // Process each tenant
    for (const [tenantId, summary] of Object.entries(feesByTenant)) {
      try {
        // Get tenant name
        const { data: tenant } = await supabase
          .from('tenants')
          .select('name')
          .eq('id', tenantId)
          .single();

        // Generate invoice number
        const { data: invoiceNumber } = await supabase
          .rpc('generate_invoice_number');

        // Calculate due date (7 days from now)
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7);

        // Create invoice
        const { data: invoice, error: invoiceError } = await supabase
          .from('platform_invoices')
          .insert({
            tenant_id: tenantId,
            invoice_number: invoiceNumber,
            amount: summary.total_fee,
            status: 'pending',
            due_date: dueDate.toISOString(),
            description: `Platform fees for ${summary.count} transactions (Base: ₦${summary.total_base.toFixed(2)})`,
            metadata: {
              billing_period: new Date().toISOString().slice(0, 7), // YYYY-MM
              transaction_count: summary.count,
              base_amount: summary.total_base
            }
          })
          .select()
          .single();

        if (invoiceError) {
          console.error(`Error creating invoice for tenant ${tenantId}:`, invoiceError);
          results.push({ tenant_id: tenantId, success: false, error: invoiceError.message });
          continue;
        }

        console.log(`Created invoice ${invoice.invoice_number} for tenant ${tenantId}: ₦${summary.total_fee.toFixed(2)}`);

        // Update ledger entries to 'billed' status with invoice_id
        const { error: updateError } = await supabase
          .from('platform_fee_ledger')
          .update({
            status: 'billed',
            invoice_id: invoice.id,
            billed_at: new Date().toISOString()
          })
          .eq('tenant_id', tenantId)
          .eq('status', 'pending')
          .eq('billing_cycle', 'monthly');

        if (updateError) {
          console.error(`Error updating ledger for tenant ${tenantId}:`, updateError);
          results.push({ tenant_id: tenantId, success: false, error: updateError.message });
          continue;
        }

        results.push({
          tenant_id: tenantId,
          tenant_name: tenant?.name,
          success: true,
          invoice_number: invoice.invoice_number,
          amount: summary.total_fee,
          transaction_count: summary.count
        });

      } catch (error) {
        console.error(`Error processing tenant ${tenantId}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({ tenant_id: tenantId, success: false, error: errorMessage });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`Billing process completed: ${successCount}/${results.length} tenants processed successfully`);

    return new Response(
      JSON.stringify({
        message: 'Monthly billing process completed',
        processed: successCount,
        total: results.length,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Platform fee billing error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
