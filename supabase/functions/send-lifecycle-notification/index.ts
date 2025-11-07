import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  tenant_id: string;
  event_type: 'suspended' | 'activated' | 'plan_changed' | 'password_reset';
  details: {
    reason?: string;
    old_plan?: string;
    new_plan?: string;
    user_email?: string;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { tenant_id, event_type, details }: NotificationRequest = await req.json();

    console.log('Sending lifecycle notification:', { tenant_id, event_type });

    // Get tenant info
    const { data: tenant, error: tenantError } = await supabase
      .from('platform_tenants')
      .select('domain, owner_email')
      .eq('id', tenant_id)
      .single();

    if (tenantError || !tenant) {
      throw new Error('Tenant not found');
    }

    // Get owner user
    const { data: ownerRole } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('tenant_id', tenant_id)
      .eq('role', 'owner')
      .maybeSingle();

    let ownerProfile = null;
    if (ownerRole?.user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', ownerRole.user_id)
        .maybeSingle();
      
      ownerProfile = profile;
    }

    const recipientEmail = ownerProfile?.email || tenant.owner_email;
    const recipientName = ownerProfile?.full_name || 'Tenant Owner';

    // Prepare email content based on event type
    let subject = '';
    let htmlContent = '';

    switch (event_type) {
      case 'suspended':
        subject = `Important: Your account has been suspended`;
        htmlContent = `
          <h2>Account Suspended</h2>
          <p>Dear ${recipientName},</p>
          <p>Your tenant account (${tenant.domain || tenant_id}) has been suspended.</p>
          ${details.reason ? `<p><strong>Reason:</strong> ${details.reason}</p>` : ''}
          <p>Please contact support to resolve this issue and reactivate your account.</p>
          <p>Best regards,<br/>Platform Support Team</p>
        `;
        break;

      case 'activated':
        subject = `Great news! Your account has been reactivated`;
        htmlContent = `
          <h2>Account Reactivated</h2>
          <p>Dear ${recipientName},</p>
          <p>Your tenant account (${tenant.domain || tenant_id}) has been reactivated.</p>
          <p>You can now log in and access all features again.</p>
          <p>Best regards,<br/>Platform Support Team</p>
        `;
        break;

      case 'plan_changed':
        subject = `Your subscription plan has been updated`;
        htmlContent = `
          <h2>Plan Updated</h2>
          <p>Dear ${recipientName},</p>
          <p>Your subscription plan has been updated:</p>
          ${details.old_plan ? `<p>Previous plan: ${details.old_plan}</p>` : ''}
          ${details.new_plan ? `<p>New plan: ${details.new_plan}</p>` : ''}
          <p>The changes are now in effect.</p>
          <p>Best regards,<br/>Platform Support Team</p>
        `;
        break;

      case 'password_reset':
        subject = `Your password has been reset`;
        htmlContent = `
          <h2>Password Reset</h2>
          <p>Dear ${recipientName},</p>
          <p>Your password for ${details.user_email || 'your account'} has been reset by an administrator.</p>
          <p>You will be required to set a new password on your next login.</p>
          <p>If you did not request this change, please contact support immediately.</p>
          <p>Best regards,<br/>Platform Support Team</p>
        `;
        break;

      default:
        throw new Error(`Unknown event type: ${event_type}`);
    }

    // Send email notification
    const { error: emailError } = await supabase.functions.invoke('email-provider', {
      body: {
        to: recipientEmail,
        subject,
        html: htmlContent,
        tenant_id: tenant_id
      }
    });

    if (emailError) {
      console.error('Email send error:', emailError);
      // Don't throw - continue with SMS if email fails
    }

    // Check if tenant has SMS credits for SMS notification
    const { data: creditPool } = await supabase
      .from('platform_sms_credit_pool')
      .select('*')
      .eq('tenant_id', tenant_id)
      .maybeSingle();

    const availableCredits = (creditPool?.total_credits || 0) - (creditPool?.consumed_credits || 0);

    // Send SMS if critical event and credits available
    if (['suspended', 'activated'].includes(event_type) && availableCredits > 0) {
      // Get owner phone
      const { data: guestData } = await supabase
        .from('guests')
        .select('phone')
        .eq('user_id', ownerRole?.user_id)
        .eq('tenant_id', tenant_id)
        .maybeSingle();

      if (guestData?.phone) {
        let smsMessage = '';
        if (event_type === 'suspended') {
          smsMessage = `ALERT: Your account has been suspended. ${details.reason ? `Reason: ${details.reason}` : ''} Contact support.`;
        } else {
          smsMessage = `Your account has been reactivated. You can now log in again.`;
        }

        const { error: smsError } = await supabase.functions.invoke('send-sms', {
          headers: {
            Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: {
            tenant_id: tenant_id,
            to: guestData.phone,
            message: smsMessage
          }
        });

        if (smsError) {
          console.error('SMS send error:', smsError);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        email_sent: !emailError,
        message: 'Notification sent successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Notification error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to send notification' }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
