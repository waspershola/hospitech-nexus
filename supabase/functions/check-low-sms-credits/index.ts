import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting low SMS credits check...');

    // Get all tenants with SMS credits
    const { data: credits, error: creditsError } = await supabase
      .from('tenant_sms_credits')
      .select('*, tenant:tenant_id(id, name)')
      .gt('total_purchased', 0);

    if (creditsError) {
      console.error('Error fetching credits:', creditsError);
      throw creditsError;
    }

    const alertsSent = [];
    const now = new Date();

    for (const credit of credits || []) {
      const usagePercent = credit.total_purchased > 0 
        ? (credit.credits_used / credit.total_purchased) * 100 
        : 0;
      const remainingPercent = 100 - usagePercent;

      // Alert thresholds: Critical (<10%), Low (<25%)
      let alertLevel: 'critical' | 'low' | null = null;
      
      if (remainingPercent < 10 && credit.credits_available > 0) {
        alertLevel = 'critical';
      } else if (remainingPercent < 25 && credit.credits_available > 0) {
        alertLevel = 'low';
      }

      if (alertLevel) {
        // Check if we've sent an alert recently (within last 24 hours)
        const { data: recentAlerts } = await supabase
          .from('platform_audit_stream')
          .select('created_at')
          .eq('event_type', 'low_sms_credits_alert')
          .eq('metadata->>tenant_id', credit.tenant_id)
          .gte('created_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
          .limit(1);

        if (recentAlerts && recentAlerts.length > 0) {
          console.log(`Skipping alert for tenant ${credit.tenant_id} - already alerted in last 24h`);
          continue;
        }

        // Get tenant owners/admins
        const { data: adminUsers } = await supabase
          .from('user_roles')
          .select('user_id, profiles:user_id(email, full_name)')
          .eq('tenant_id', credit.tenant_id)
          .in('role', ['owner', 'admin', 'manager']);

        if (adminUsers && adminUsers.length > 0) {
          for (const admin of adminUsers) {
            const profile = (admin as any).profiles;
            if (profile?.email) {
              // Send email notification
              try {
                await supabase.functions.invoke('email-provider', {
                  body: {
                    to: profile.email,
                    subject: `${alertLevel === 'critical' ? '🚨 Critical' : '⚠️ Low'} SMS Credits Alert`,
                    html: `
                      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: ${alertLevel === 'critical' ? '#dc2626' : '#ea580c'};">
                          ${alertLevel === 'critical' ? '🚨 Critical SMS Credits Alert' : '⚠️ Low SMS Credits Alert'}
                        </h2>
                        <p>Hello ${profile.full_name || 'there'},</p>
                        <p>Your SMS credit balance is running ${alertLevel}.</p>
                        
                        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                          <h3 style="margin-top: 0;">Current Balance</h3>
                          <p style="font-size: 24px; font-weight: bold; color: ${alertLevel === 'critical' ? '#dc2626' : '#ea580c'}; margin: 10px 0;">
                            ${credit.credits_available.toLocaleString()} SMS credits
                          </p>
                          <p style="margin: 5px 0;">
                            <strong>Used:</strong> ${credit.credits_used.toLocaleString()} credits
                          </p>
                          <p style="margin: 5px 0;">
                            <strong>Total Purchased:</strong> ${credit.total_purchased.toLocaleString()} credits
                          </p>
                          <p style="margin: 5px 0;">
                            <strong>Remaining:</strong> ${remainingPercent.toFixed(1)}%
                          </p>
                        </div>

                        <p>To avoid service interruption, please purchase more SMS credits from the marketplace.</p>
                        
                        <a href="${supabaseUrl.replace('supabase.co', 'lovableproject.com')}/dashboard/marketplace" 
                           style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
                          Purchase SMS Credits
                        </a>

                        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                          This is an automated alert. You're receiving this because you're an administrator for ${(credit.tenant as any)?.name || 'your property'}.
                        </p>
                      </div>
                    `,
                  },
                });

                console.log(`Alert email sent to ${profile.email} for tenant ${credit.tenant_id}`);
              } catch (emailError) {
                console.error(`Failed to send email to ${profile.email}:`, emailError);
              }
            }
          }

          // Log the alert
          await supabase.from('platform_audit_stream').insert({
            event_type: 'low_sms_credits_alert',
            metadata: {
              tenant_id: credit.tenant_id,
              alert_level: alertLevel,
              credits_available: credit.credits_available,
              credits_used: credit.credits_used,
              total_purchased: credit.total_purchased,
              remaining_percent: remainingPercent,
              recipients: adminUsers.length,
            },
          });

          alertsSent.push({
            tenant_id: credit.tenant_id,
            alert_level: alertLevel,
            credits_available: credit.credits_available,
            recipients: adminUsers.length,
          });
        }
      }
    }

    console.log(`Low credits check completed. Alerts sent: ${alertsSent.length}`);

    return new Response(JSON.stringify({
      success: true,
      checked: credits?.length || 0,
      alerts_sent: alertsSent.length,
      alerts: alertsSent,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Low credits check error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
