import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InviteStaffRequest {
  full_name: string;
  email: string;
  department: string;
  role: string;
  branch?: string;
  supervisor_id?: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authenticated user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's tenant and role
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !userRole) {
      return new Response(
        JSON.stringify({ error: 'User role not found' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check permissions (only owner and manager can invite)
    if (!['owner', 'manager'].includes(userRole.role)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const inviteData: InviteStaffRequest = await req.json();

    // Check if staff already exists
    const { data: existingStaff } = await supabase
      .from('staff')
      .select('id')
      .eq('tenant_id', userRole.tenant_id)
      .eq('email', inviteData.email)
      .single();

    if (existingStaff) {
      return new Response(
        JSON.stringify({ error: 'Staff member with this email already exists' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for existing pending invitation
    const { data: existingInvitation } = await supabase
      .from('staff_invitations')
      .select('id')
      .eq('tenant_id', userRole.tenant_id)
      .eq('email', inviteData.email)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (existingInvitation) {
      return new Response(
        JSON.stringify({ error: 'Pending invitation already exists for this email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get hotel/tenant details
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', userRole.tenant_id)
      .single();

    // Create invitation record
    const { data: invitation, error: invitationError } = await supabase
      .from('staff_invitations')
      .insert({
        tenant_id: userRole.tenant_id,
        email: inviteData.email,
        full_name: inviteData.full_name,
        department: inviteData.department,
        role: inviteData.role,
        invited_by: user.id,
      })
      .select()
      .single();

    if (invitationError) {
      console.error('Error creating invitation:', invitationError);
      return new Response(
        JSON.stringify({ error: 'Failed to create invitation' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate invitation URL
    const appUrl = Deno.env.get('APP_URL') || supabaseUrl.replace('supabase.co', 'lovableproject.com');
    const invitationUrl = `${appUrl}/auth/onboard?token=${invitation.invitation_token}`;

    // Generate HTML email
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif; background-color: #f6f9fc; margin: 0; padding: 0;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px;">
            <h1 style="color: #333; font-size: 24px; font-weight: bold; margin: 0 0 30px 0;">Welcome to the Team!</h1>
            
            <p style="color: #333; font-size: 16px; line-height: 26px; margin: 0 0 20px 0;">
              Hi ${inviteData.full_name},
            </p>
            
            <p style="color: #333; font-size: 16px; line-height: 26px; margin: 0 0 20px 0;">
              You've been invited to join <strong>${tenant?.name || 'our team'}</strong> as a 
              <strong>${inviteData.role.replace('_', ' ')}</strong> in the 
              <strong>${inviteData.department.replace('_', ' ')}</strong> department.
            </p>

            <div style="margin: 30px 0;">
              <a href="${invitationUrl}" style="display: inline-block; background-color: #dc2626; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                Accept Invitation & Setup Account
              </a>
            </div>

            <p style="color: #333; font-size: 14px; line-height: 22px; margin: 20px 0;">
              Or copy and paste this URL into your browser:
            </p>
            <p style="color: #2563eb; font-size: 14px; word-break: break-all; margin: 0 0 20px 0;">
              ${invitationUrl}
            </p>

            <p style="color: #666; font-size: 14px; line-height: 22px; margin: 20px 0;">
              This invitation expires in 7 days.
            </p>

            <p style="color: #666; font-size: 14px; line-height: 22px; margin: 20px 0;">
              If you have any questions, please contact your manager.
            </p>

            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #8898aa; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} ${tenant?.name || 'Hotel Management'}. All rights reserved.
            </p>
          </div>
        </body>
      </html>
    `;

    // Send invitation email using Resend API
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${tenant?.name || 'Hotel Management'} <onboarding@resend.dev>`,
        to: [inviteData.email],
        subject: `You've been invited to join ${tenant?.name || 'our team'}`,
        html: emailHtml,
      }),
    });

    const emailResult = await emailResponse.json();
    const emailSuccess = emailResponse.ok;

    if (!emailSuccess) {
      console.error('Error sending email:', emailResult);
      // Don't fail the request if email fails, invitation is still created
    }

    // Log activity
    await supabase
      .from('staff_activity')
      .insert({
        tenant_id: userRole.tenant_id,
        staff_id: user.id,
        action: 'staff_invited',
        description: `Invited ${inviteData.full_name} (${inviteData.email}) as ${inviteData.role}`,
        metadata: { invitation_id: invitation.id },
      });

    console.log(`Staff invitation created: ${invitation.id} for ${inviteData.email}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Invitation sent successfully',
        invitation_id: invitation.id,
        email_sent: emailSuccess,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error("Error in invite-staff function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
