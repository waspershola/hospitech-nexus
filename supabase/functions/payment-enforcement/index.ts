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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify platform admin or system bot
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      );

      if (user) {
        const { data: platformUser } = await supabase
          .from('platform_users')
          .select('role')
          .eq('id', user.id)
          .single();

        if (!platformUser || !['super_admin', 'billing_bot', 'monitoring_bot'].includes(platformUser.role)) {
          throw new Error('Insufficient permissions');
        }
      }
    }

    console.log('Starting payment enforcement check');

    const now = new Date();
    const results = {
      reminders_sent: 0,
      invoices_marked_overdue: 0,
      tenants_suspended: 0,
      errors: [] as string[],
    };

    // Get all pending invoices
    const { data: pendingInvoices, error: invoicesError } = await supabase
      .from('platform_invoices')
      .select(`
        *,
        tenants(id, name, status),
        tenant_subscriptions(id, status)
      `)
      .in('status', ['pending', 'overdue']);

    if (invoicesError) throw invoicesError;

    for (const invoice of pendingInvoices || []) {
      const tenant = invoice.tenants as any;
      const dueDate = new Date(invoice.due_date);
      const daysPastDue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      // Mark as overdue if past due date
      if (daysPastDue > 0 && invoice.status === 'pending') {
        await supabase
          .from('platform_invoices')
          .update({ status: 'overdue' })
          .eq('id', invoice.id);
        
        results.invoices_marked_overdue++;
        console.log(`Marked invoice ${invoice.invoice_number} as overdue`);
      }

      // Send reminders based on days past due
      let reminderType = null;
      
      if (daysPastDue === 1) {
        reminderType = 'first_reminder'; // 1 day overdue
      } else if (daysPastDue === 3) {
        reminderType = 'second_reminder'; // 3 days overdue
      } else if (daysPastDue === 7) {
        reminderType = 'final_warning'; // 7 days overdue
      }

      if (reminderType) {
        try {
          await supabase.functions.invoke('email-provider', {
            body: {
              action: 'send_payment_reminder',
              tenant_id: tenant.id,
              invoice_id: invoice.id,
              reminder_type: reminderType,
              days_overdue: daysPastDue,
              invoice,
            },
          });
          
          results.reminders_sent++;
          console.log(`Sent ${reminderType} to ${tenant.name} for invoice ${invoice.invoice_number}`);
        } catch (emailError) {
          const errorMsg = `Failed to send reminder to ${tenant.name}: ${emailError}`;
          console.error(errorMsg);
          results.errors.push(errorMsg);
        }
      }

      // Suspend tenant after grace period (14 days)
      if (daysPastDue >= 14 && tenant.status === 'active') {
        try {
          // Update tenant status to suspended
          await supabase
            .from('tenants')
            .update({ 
              status: 'suspended',
              metadata: {
                suspension_reason: 'payment_overdue',
                suspended_at: now.toISOString(),
                overdue_invoice_id: invoice.id,
                days_overdue: daysPastDue,
              },
            })
            .eq('id', tenant.id);

          // Suspend subscription
          const subscription = invoice.tenant_subscriptions as any;
          if (subscription) {
            await supabase
              .from('tenant_subscriptions')
              .update({ status: 'suspended' })
              .eq('id', subscription.id);
          }

          // Send suspension notification
          await supabase.functions.invoke('email-provider', {
            body: {
              action: 'send_suspension_notice',
              tenant_id: tenant.id,
              invoice_id: invoice.id,
              days_overdue: daysPastDue,
              invoice,
            },
          });

          results.tenants_suspended++;
          console.log(`Suspended tenant ${tenant.name} after ${daysPastDue} days overdue`);
        } catch (suspensionError) {
          const errorMsg = `Failed to suspend ${tenant.name}: ${suspensionError}`;
          console.error(errorMsg);
          results.errors.push(errorMsg);
        }
      }
    }

    console.log('Payment enforcement completed:', results);

    return new Response(
      JSON.stringify({
        success: true,
        ...results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in payment enforcement:', error);
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
