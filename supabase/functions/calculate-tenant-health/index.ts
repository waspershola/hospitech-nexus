import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HealthScore {
  tenant_id: string;
  tenant_name: string;
  overall_score: number;
  payment_score: number;
  usage_score: number;
  engagement_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  flags: string[];
  recommendations: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting tenant health score calculation');

    const { tenant_id } = await req.json().catch(() => ({}));

    // Fetch tenants
    let tenantsQuery = supabase
      .from('tenants')
      .select('id, name, status, created_at, metadata');
    
    if (tenant_id) {
      tenantsQuery = tenantsQuery.eq('id', tenant_id);
    }

    const { data: tenants, error: tenantsError } = await tenantsQuery;
    if (tenantsError) throw tenantsError;

    const healthScores: HealthScore[] = [];

    for (const tenant of tenants || []) {
      const flags: string[] = [];
      const recommendations: string[] = [];

      // 1. PAYMENT SCORE (40% weight)
      const { data: invoices } = await supabase
        .from('platform_invoices')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false });

      let paymentScore = 100;
      
      const overdueInvoices = invoices?.filter(inv => inv.status === 'overdue') || [];
      const paidInvoices = invoices?.filter(inv => inv.status === 'paid') || [];
      const totalInvoices = invoices?.length || 0;

      if (overdueInvoices.length > 0) {
        paymentScore -= overdueInvoices.length * 20;
        flags.push(`${overdueInvoices.length} overdue invoice(s)`);
        recommendations.push('Contact tenant about overdue payments immediately');
      }

      if (totalInvoices > 0) {
        const paymentRate = (paidInvoices.length / totalInvoices) * 100;
        if (paymentRate < 80) {
          paymentScore -= 15;
          flags.push(`Low payment rate: ${paymentRate.toFixed(0)}%`);
          recommendations.push('Review payment history and consider payment plan');
        }
      }

      // Check for late payments (paid after due date)
      const latePayments = paidInvoices?.filter(inv => {
        if (!inv.paid_at || !inv.due_date) return false;
        return new Date(inv.paid_at) > new Date(inv.due_date);
      }) || [];

      if (latePayments.length > 2) {
        paymentScore -= 10;
        flags.push(`${latePayments.length} late payments`);
        recommendations.push('Implement payment reminders earlier in cycle');
      }

      // 2. USAGE SCORE (30% weight)
      const { data: usage } = await supabase
        .from('tenant_usage_logs')
        .select('*')
        .eq('tenant_id', tenant.id)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      const { data: subscription } = await supabase
        .from('tenant_subscriptions')
        .select('*, subscription_plans(*)')
        .eq('tenant_id', tenant.id)
        .single();

      let usageScore = 100;

      if (usage && usage.length > 0) {
        const totalUsage = usage.reduce((sum, u) => sum + (u.quantity || 0), 0);
        const plan = subscription?.subscription_plans as any;
        
        if (plan?.limits) {
          const limits = typeof plan.limits === 'string' ? JSON.parse(plan.limits) : plan.limits;
          const storageLimit = limits.storage_gb || 10;
          const storageUsage = usage.filter(u => u.metric_type === 'storage_gb')
            .reduce((sum, u) => sum + (u.quantity || 0), 0);
          
          const usagePercent = (storageUsage / storageLimit) * 100;

          if (usagePercent < 20) {
            usageScore -= 30;
            flags.push(`Very low usage: ${usagePercent.toFixed(0)}%`);
            recommendations.push('Engage tenant to increase adoption and usage');
          } else if (usagePercent > 95) {
            usageScore -= 10;
            flags.push(`Near limit: ${usagePercent.toFixed(0)}%`);
            recommendations.push('Suggest plan upgrade to prevent service disruption');
          }
        }
      } else {
        usageScore -= 40;
        flags.push('No usage data in last 30 days');
        recommendations.push('Investigate inactivity - risk of churn');
      }

      // 3. ENGAGEMENT SCORE (30% weight)
      let engagementScore = 100;

      // Check account age
      const accountAgeMonths = Math.floor(
        (Date.now() - new Date(tenant.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30)
      );

      // Check subscription status
      if (subscription?.status === 'trialing') {
        engagementScore -= 20;
        flags.push('Still in trial period');
        recommendations.push('Prepare trial-to-paid conversion strategy');
      } else if (subscription?.status === 'cancelled') {
        engagementScore -= 50;
        flags.push('Subscription cancelled');
        recommendations.push('Reach out for exit interview and win-back offer');
      } else if (subscription?.status === 'suspended') {
        engagementScore -= 60;
        flags.push('Account suspended');
        recommendations.push('Review suspension reason and create reactivation plan');
      }

      // Check for metadata indicating issues
      const metadata = typeof tenant.metadata === 'string' 
        ? JSON.parse(tenant.metadata) 
        : tenant.metadata;
      
      if (metadata?.support_tickets_count > 5) {
        engagementScore -= 15;
        flags.push(`High support ticket count: ${metadata.support_tickets_count}`);
        recommendations.push('Review support issues for systematic problems');
      }

      // Calculate overall score (weighted average)
      const overallScore = Math.max(0, Math.min(100,
        (paymentScore * 0.4) + (usageScore * 0.3) + (engagementScore * 0.3)
      ));

      // Determine risk level
      let riskLevel: 'low' | 'medium' | 'high' | 'critical';
      if (overallScore >= 80) riskLevel = 'low';
      else if (overallScore >= 60) riskLevel = 'medium';
      else if (overallScore >= 40) riskLevel = 'high';
      else riskLevel = 'critical';

      // Add general recommendations based on risk level
      if (riskLevel === 'critical') {
        recommendations.push('URGENT: Schedule immediate call with decision maker');
      } else if (riskLevel === 'high') {
        recommendations.push('Assign customer success manager for intervention');
      }

      healthScores.push({
        tenant_id: tenant.id,
        tenant_name: tenant.name,
        overall_score: Math.round(overallScore),
        payment_score: Math.max(0, Math.round(paymentScore)),
        usage_score: Math.max(0, Math.round(usageScore)),
        engagement_score: Math.max(0, Math.round(engagementScore)),
        risk_level: riskLevel,
        flags,
        recommendations,
      });

      console.log(`Health score for ${tenant.name}: ${overallScore.toFixed(0)} (${riskLevel})`);
    }

    // Sort by overall score (lowest first - highest risk)
    healthScores.sort((a, b) => a.overall_score - b.overall_score);

    return new Response(
      JSON.stringify({
        success: true,
        health_scores: healthScores,
        summary: {
          total_tenants: healthScores.length,
          critical: healthScores.filter(h => h.risk_level === 'critical').length,
          high: healthScores.filter(h => h.risk_level === 'high').length,
          medium: healthScores.filter(h => h.risk_level === 'medium').length,
          low: healthScores.filter(h => h.risk_level === 'low').length,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error calculating tenant health:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
