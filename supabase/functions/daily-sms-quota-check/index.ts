import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting daily SMS quota check for all tenants');

    // Get all tenants with SMS settings enabled
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenant_sms_settings')
      .select('tenant_id, enabled')
      .eq('enabled', true);

    if (tenantsError) {
      console.error('Error fetching tenants:', tenantsError);
      throw tenantsError;
    }

    if (!tenants || tenants.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No tenants with SMS enabled',
          checked: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Checking quota for ${tenants.length} tenants`);

    let alertsSent = 0;
    const results: any[] = [];

    // Check quota for each tenant
    for (const tenant of tenants) {
      try {
        const { data, error } = await supabase.functions.invoke('check-sms-quota-alerts', {
          body: { tenant_id: tenant.tenant_id },
        });

        if (error) {
          console.error(`Error checking quota for tenant ${tenant.tenant_id}:`, error);
          results.push({
            tenant_id: tenant.tenant_id,
            success: false,
            error: error.message,
          });
        } else {
          console.log(`Quota check result for ${tenant.tenant_id}:`, data);
          if (data.alert_sent) {
            alertsSent++;
          }
          results.push({
            tenant_id: tenant.tenant_id,
            success: true,
            alert_sent: data.alert_sent || false,
          });
        }
      } catch (err: any) {
        console.error(`Exception checking tenant ${tenant.tenant_id}:`, err);
        results.push({
          tenant_id: tenant.tenant_id,
          success: false,
          error: err.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        checked: tenants.length,
        alerts_sent: alertsSent,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in daily-sms-quota-check:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
