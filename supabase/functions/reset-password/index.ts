import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate secure random password
function generateTempPassword(length = 10): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  return Array.from(randomValues)
    .map(x => charset[x % charset.length])
    .join('');
}

// Send welcome email with credentials
async function sendWelcomeEmail(
  email: string,
  fullName: string,
  hotelName: string,
  tempPassword: string,
  loginUrl: string
) {
  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f6f9fc; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px;">
          <h1 style="color: #333; font-size: 24px; font-weight: bold; margin: 0 0 30px 0;">Welcome to ${hotelName}!</h1>
          
          <p style="color: #333; font-size: 16px; line-height: 26px; margin: 0 0 20px 0;">
            Hi ${fullName},
          </p>
          
          <p style="color: #333; font-size: 16px; line-height: 26px; margin: 0 0 20px 0;">
            Your staff account has been created at <strong>${hotelName}</strong>. You can now access the management system.
          </p>

          <div style="background-color: #f8f9fa; border-left: 4px solid #dc2626; padding: 20px; margin: 30px 0;">
            <h3 style="margin: 0 0 15px 0; color: #333; font-size: 16px;">Your Login Credentials</h3>
            <p style="margin: 5px 0; color: #666; font-size: 14px;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 5px 0; color: #666; font-size: 14px;"><strong>Temporary Password:</strong> <code style="background: #fff; padding: 4px 8px; border-radius: 4px; color: #dc2626; font-weight: bold;">${tempPassword}</code></p>
          </div>

          <div style="margin: 30px 0;">
            <a href="${loginUrl}" style="display: inline-block; background-color: #dc2626; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
              Login to Your Account
            </a>
          </div>

          <div style="background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #856404; font-size: 14px;">
              <strong>⚠️ Security Notice:</strong> You will be required to change this password on your first login. Please keep it secure until then.
            </p>
          </div>

          <p style="color: #666; font-size: 14px; line-height: 22px; margin: 20px 0;">
            If you have any questions, please contact your manager.
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="color: #8898aa; font-size: 12px; margin: 0;">
            © ${new Date().getFullYear()} ${hotelName}. All rights reserved.
          </p>
        </div>
      </body>
    </html>
  `;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${hotelName} <onboarding@resend.dev>`,
      to: [email],
      subject: `Welcome to ${hotelName} - Your Account Credentials`,
      html: emailHtml,
    }),
  });

  return response.ok;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: userRole } = await supabase
      .from('user_roles')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .single();

    if (!userRole) {
      return new Response(
        JSON.stringify({ error: 'User role not found' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: tenant } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', userRole.tenant_id)
      .single();

    const requestData = await req.json();

    // Send password reset
    if (req.url.includes('/reset-password')) {
      const { staff_id } = requestData;

      const { data: staffMember } = await supabase
        .from('staff')
        .select('email, full_name, user_id')
        .eq('id', staff_id)
        .eq('tenant_id', userRole.tenant_id)
        .single();

      if (!staffMember) {
        return new Response(
          JSON.stringify({ error: 'Staff member not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Generate new temporary password
      const tempPassword = generateTempPassword();

      // Update auth user password
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        staffMember.user_id,
        { password: tempPassword }
      );

      if (updateError) {
        console.error('Error updating password:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to reset password' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Set password reset required
      await supabase
        .from('staff')
        .update({ password_reset_required: true })
        .eq('id', staff_id);

      // Send email with new password
      const loginUrl = `${supabaseUrl.replace('supabase.co', 'lovableproject.com')}/auth/login`;
      const emailSent = await sendWelcomeEmail(
        staffMember.email,
        staffMember.full_name,
        tenant?.name || 'Hotel',
        tempPassword,
        loginUrl
      );

      // Log activity
      await supabase
        .from('staff_activity')
        .insert({
          tenant_id: userRole.tenant_id,
          staff_id: user.id,
          action: 'password_reset',
          description: `Reset password for ${staffMember.full_name}`,
          metadata: { target_staff_id: staff_id },
        });

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Password reset successfully',
          data: {
            new_password: tempPassword,
            email_sent: emailSent,
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid endpoint' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error("Error in reset-password function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
