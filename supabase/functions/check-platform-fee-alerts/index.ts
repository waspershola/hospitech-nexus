import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AlertRule {
  id: string;
  name: string;
  period: 'daily' | 'weekly' | 'monthly';
  metric: 'total_revenue' | 'booking_revenue' | 'qr_revenue' | 'tenant_revenue';
  threshold_type: 'absolute' | 'percentage_drop';
  threshold_value: number;
  comparison_period: string | null;
  tenant_id: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting platform fee alert check...');

    // Fetch active alert rules
    const { data: rules, error: rulesError } = await supabaseClient
      .from('platform_fee_alert_rules')
      .select('*')
      .eq('active', true);

    if (rulesError) {
      throw rulesError;
    }

    console.log(`Found ${rules?.length || 0} active alert rules`);

    const alerts = [];

    for (const rule of rules || []) {
      try {
        const alert = await checkRule(supabaseClient, rule);
        if (alert) {
          alerts.push(alert);
        }
      } catch (error) {
        console.error(`Error checking rule ${rule.id}:`, error);
      }
    }

    console.log(`Generated ${alerts.length} alerts`);

    // Insert alerts into database
    if (alerts.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('platform_fee_alerts')
        .insert(alerts);

      if (insertError) {
        throw insertError;
      }
    }

    // Update last_checked_at for all rules
    await supabaseClient
      .from('platform_fee_alert_rules')
      .update({ last_checked_at: new Date().toISOString() })
      .in('id', rules?.map(r => r.id) || []);

    return new Response(
      JSON.stringify({ 
        success: true, 
        rulesChecked: rules?.length || 0,
        alertsGenerated: alerts.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in check-platform-fee-alerts:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function checkRule(supabaseClient: any, rule: AlertRule) {
  const now = new Date();
  const { periodStart, periodEnd, comparisonStart, comparisonEnd } = getPeriodRanges(now, rule.period, rule.comparison_period);

  console.log(`Checking rule: ${rule.name} (${rule.period})`);

  // Calculate current period revenue
  const currentRevenue = await calculateRevenue(
    supabaseClient,
    periodStart,
    periodEnd,
    rule.metric,
    rule.tenant_id
  );

  console.log(`Current ${rule.metric}: ${currentRevenue}`);

  // Check absolute threshold
  if (rule.threshold_type === 'absolute') {
    if (currentRevenue <= rule.threshold_value) {
      return createAlert(rule, currentRevenue, rule.threshold_value, periodStart, periodEnd, 'critical');
    }
    return null;
  }

  // Check percentage drop
  if (rule.threshold_type === 'percentage_drop' && rule.comparison_period) {
    const previousRevenue = await calculateRevenue(
      supabaseClient,
      comparisonStart!,
      comparisonEnd!,
      rule.metric,
      rule.tenant_id
    );

    console.log(`Previous ${rule.metric}: ${previousRevenue}`);

    if (previousRevenue > 0) {
      const percentageChange = ((previousRevenue - currentRevenue) / previousRevenue) * 100;
      console.log(`Percentage drop: ${percentageChange.toFixed(2)}%`);

      if (percentageChange >= rule.threshold_value) {
        const severity = percentageChange >= 50 ? 'critical' : percentageChange >= 30 ? 'warning' : 'info';
        return createAlert(rule, currentRevenue, previousRevenue, periodStart, periodEnd, severity);
      }
    }
  }

  return null;
}

async function calculateRevenue(
  supabaseClient: any,
  startDate: Date,
  endDate: Date,
  metric: string,
  tenantId: string | null
): Promise<number> {
  let query = supabaseClient
    .from('platform_fee_ledger')
    .select('fee_amount, reference_type')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .in('status', ['billed', 'paid']);

  if (tenantId) {
    query = query.eq('tenant_id', tenantId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    return 0;
  }

  switch (metric) {
    case 'total_revenue':
      return data.reduce((sum: number, entry: any) => sum + Number(entry.fee_amount), 0);
    
    case 'booking_revenue':
      return data
        .filter((e: any) => e.reference_type === 'booking')
        .reduce((sum: number, entry: any) => sum + Number(entry.fee_amount), 0);
    
    case 'qr_revenue':
      return data
        .filter((e: any) => ['qr_payment', 'qr_request'].includes(e.reference_type))
        .reduce((sum: number, entry: any) => sum + Number(entry.fee_amount), 0);
    
    default:
      return data.reduce((sum: number, entry: any) => sum + Number(entry.fee_amount), 0);
  }
}

function getPeriodRanges(now: Date, period: string, comparisonPeriod: string | null) {
  const ranges: any = {};

  switch (period) {
    case 'daily':
      ranges.periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      ranges.periodEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      if (comparisonPeriod === 'previous_day') {
        ranges.comparisonStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2);
        ranges.comparisonEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      }
      break;

    case 'weekly':
      ranges.periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      ranges.periodEnd = now;
      
      if (comparisonPeriod === 'previous_week') {
        ranges.comparisonStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        ranges.comparisonEnd = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }
      break;

    case 'monthly':
      ranges.periodStart = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      ranges.periodEnd = now;
      
      if (comparisonPeriod === 'previous_month') {
        ranges.comparisonStart = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate());
        ranges.comparisonEnd = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      }
      break;
  }

  return ranges;
}

function createAlert(
  rule: AlertRule,
  currentValue: number,
  expectedValue: number,
  periodStart: Date,
  periodEnd: Date,
  severity: string
) {
  const alertType = currentValue === 0 ? 'zero_revenue' : 'threshold_breach';
  
  let message = '';
  if (rule.threshold_type === 'absolute') {
    message = `Revenue of ₦${currentValue.toLocaleString()} is at or below the threshold of ₦${expectedValue.toLocaleString()} for ${rule.period} period.`;
  } else {
    const percentDrop = ((expectedValue - currentValue) / expectedValue * 100).toFixed(1);
    message = `Revenue dropped by ${percentDrop}% from ₦${expectedValue.toLocaleString()} to ₦${currentValue.toLocaleString()} compared to ${rule.comparison_period}.`;
  }

  return {
    rule_id: rule.id,
    alert_type: alertType,
    severity,
    title: `${rule.name} - Alert Triggered`,
    message,
    current_value: currentValue,
    expected_value: expectedValue,
    threshold_value: rule.threshold_value,
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
    tenant_id: rule.tenant_id,
    metadata: {
      rule_name: rule.name,
      metric: rule.metric,
      period: rule.period
    }
  };
}
