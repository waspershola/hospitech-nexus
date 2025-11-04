import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export interface InviteStaffRequest {
  full_name: string;
  email: string;
  phone?: string;
  department: string;
  role: string;
  branch?: string;
  supervisor_id?: string;
  metadata?: Record<string, any>;
  generate_password?: boolean;
}

/**
 * Validate department against enum
 */
function validateDepartment(department: string): boolean {
  const validDepartments = [
    'front_office', 'housekeeping', 'maintenance', 'food_beverage',
    'kitchen', 'bar', 'finance', 'management', 'security', 'spa',
    'concierge', 'admin', 'inventory', 'hr'
  ];
  return validDepartments.includes(department);
}

/**
 * Map staff roles and departments to application-level roles
 * Staff roles are granular job titles (receptionist, room_attendant, etc.)
 * App roles are permission levels (frontdesk, housekeeping, manager, etc.)
 */
function mapStaffRoleToAppRole(staffRole: string, department: string): string {
  console.log(`[Role Mapping] Input - Role: "${staffRole}", Department: "${department}"`);
  
  // 1. Direct role mappings (roles that map 1:1 regardless of department)
  const directRoleMap: Record<string, string> = {
    'owner': 'owner',
    'general_manager': 'manager',
    'manager': 'manager',
    'supervisor': 'supervisor',
    'store_manager': 'store_manager',
    'inventory_manager': 'store_manager',
    'procurement_officer': 'procurement',
    'purchasing_officer': 'procurement',
  };
  
  if (directRoleMap[staffRole]) {
    console.log(`[Role Mapping] Direct map: ${staffRole} → ${directRoleMap[staffRole]}`);
    return directRoleMap[staffRole];
  }
  
  // 2. Department-based role mappings
  const departmentRoleMap: Record<string, Record<string, string>> = {
    // Front Office Department
    'front_office': {
      'receptionist': 'frontdesk',
      'guest_service_agent': 'frontdesk',
      'front_desk_supervisor': 'supervisor',
      'front_office_manager': 'manager',
      '_default': 'frontdesk'
    },
    
    // Housekeeping Department
    'housekeeping': {
      'room_attendant': 'housekeeping',
      'housekeeper': 'housekeeping',
      'housekeeping_supervisor': 'supervisor',
      'housekeeping_manager': 'manager',
      '_default': 'housekeeping'
    },
    
    // Food & Beverage Department
    'food_beverage': {
      'waiter': 'restaurant',
      'server': 'restaurant',
      'restaurant_supervisor': 'supervisor',
      'fnb_manager': 'manager',
      '_default': 'restaurant'
    },
    
    // Kitchen Department - separate from restaurant
    'kitchen': {
      'cook': 'kitchen',
      'chef': 'kitchen',
      'kitchen_assistant': 'kitchen',
      'kitchen_supervisor': 'supervisor',
      'sous_chef': 'supervisor',
      'executive_chef': 'manager',
      'kitchen_manager': 'manager',
      '_default': 'kitchen'
    },
    
    // Bar Department
    'bar': {
      'bartender': 'bar',
      'bar_supervisor': 'supervisor',
      'bar_manager': 'manager',
      '_default': 'bar'
    },
    
    // Maintenance Department
    'maintenance': {
      'technician': 'maintenance',
      'electrician': 'maintenance',
      'plumber': 'maintenance',
      'maintenance_supervisor': 'supervisor',
      'maintenance_manager': 'manager',
      '_default': 'maintenance'
    },
    
    // Finance/Accounts Department
    'accounts': {
      'cashier': 'finance',
      'accountant': 'accountant',
      'finance_supervisor': 'supervisor',
      'finance_manager': 'manager',
      '_default': 'finance'
    },
    
    // Inventory/Store Department
    'inventory': {
      'store_clerk': 'store_manager',
      'store_keeper': 'store_manager',
      'inventory_supervisor': 'supervisor',
      'inventory_manager': 'store_manager',
      'store_manager': 'store_manager',
      '_default': 'store_manager'
    },
    
    // Procurement Department
    'procurement': {
      'procurement_officer': 'procurement',
      'purchasing_officer': 'procurement',
      'procurement_manager': 'manager',
      '_default': 'procurement'
    },
    
    // HR Department
    'hr': {
      'hr_officer': 'hr',
      'hr_admin': 'hr',
      'hr_assistant': 'hr',
      'hr_coordinator': 'hr',
      'hr_supervisor': 'supervisor',
      'hr_manager': 'manager',
      '_default': 'hr'
    },
    
    // Spa Department
    'spa': {
      'therapist': 'spa',
      'spa_staff': 'spa',
      'spa_attendant': 'spa',
      'spa_supervisor': 'supervisor',
      'spa_manager': 'manager',
      '_default': 'spa'
    },
    
    // Concierge Department
    'concierge': {
      'concierge_agent': 'concierge',
      'concierge_staff': 'concierge',
      'bell_captain': 'supervisor',
      'concierge_supervisor': 'supervisor',
      'concierge_manager': 'manager',
      '_default': 'concierge'
    },
    
    // Admin Department
    'admin': {
      'admin_assistant': 'admin',
      'admin_officer': 'admin',
      'admin_coordinator': 'admin',
      'admin_supervisor': 'supervisor',
      'admin_manager': 'manager',
      '_default': 'admin'
    },
    
    // Security Department
    'security': {
      'security_staff': 'frontdesk',
      'security_supervisor': 'supervisor',
      'chief_security_officer': 'manager',
      '_default': 'frontdesk'
    },
    
    // Management Department
    'management': {
      '_default': 'manager'
    },
  };
  
  // Try to find department and role mapping
  const deptMap = departmentRoleMap[department];
  if (deptMap) {
    const appRole = deptMap[staffRole] || deptMap['_default'] || 'frontdesk';
    console.log(`[Role Mapping] Department map: ${department}.${staffRole} → ${appRole}`);
    return appRole;
  }
  
  // 3. Fallback based on department category
  console.warn(`[Role Mapping] No mapping found for "${staffRole}" in "${department}"`);
  
  // Service departments → limited_ops
  if (['spa', 'concierge'].includes(department)) {
    return 'limited_ops';
  }
  
  // Admin/HR → admin role
  if (['admin', 'hr'].includes(department)) {
    return 'admin';
  }
  
  // Inventory-related → store_user
  if (department === 'inventory') {
    return 'store_user';
  }
  
  // Last resort fallback
  return 'guest_portal_access';
}

// Generate temporary password
function generateTempPassword(length = 10): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    password += charset[randomValues[i] % charset.length];
  }
  return password;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client with proper auth configuration
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    });

    // Get and validate JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[Auth Error] Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    // Verify the JWT token and get user using the token parameter
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error('[Auth Error]', userError?.message || 'No user found');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`[Auth Success] User authenticated: ${user.email}`);


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

    // Validate department
    if (!validateDepartment(inviteData.department)) {
      return new Response(
        JSON.stringify({ error: `Invalid department. Must be one of: front_office, housekeeping, maintenance, food_beverage, kitchen, bar, finance, management, security, spa, concierge, admin, inventory, hr` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // If manual password generation is requested, create account directly
    if (inviteData.generate_password) {
      const tempPassword = generateTempPassword();

      // Create auth user with temp password
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: inviteData.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: inviteData.full_name,
        },
      });

      if (authError || !authUser.user) {
        console.error('Error creating auth user:', authError);
        return new Response(
          JSON.stringify({ error: 'Failed to create user account' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create user role (map staff role to app role)
      const appRole = mapStaffRoleToAppRole(inviteData.role, inviteData.department);
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authUser.user.id,
          tenant_id: userRole.tenant_id,
          role: appRole,
        });

      if (roleError) {
        console.error('Error creating user role:', roleError);
        // Clean up auth user
        await supabase.auth.admin.deleteUser(authUser.user.id);
        return new Response(
          JSON.stringify({ error: 'Failed to assign user role' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create staff record
      const { error: staffError } = await supabase
        .from('staff')
        .insert({
          tenant_id: userRole.tenant_id,
          user_id: authUser.user.id,
          full_name: inviteData.full_name,
          email: inviteData.email,
          phone: inviteData.phone,
          department: inviteData.department,
          role: inviteData.role,
          branch: inviteData.branch,
          supervisor_id: inviteData.supervisor_id,
          status: 'active',
          password_reset_required: true,
          metadata: inviteData.metadata || {},
        });

      if (staffError) {
        console.error('Error creating staff record:', staffError);
        // Clean up
        await supabase.auth.admin.deleteUser(authUser.user.id);
        return new Response(
          JSON.stringify({ error: 'Failed to create staff record' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log activity (log who performed the action and who was affected)
      await supabase
        .from('staff_activity')
        .insert({
          tenant_id: userRole.tenant_id,
          staff_id: authUser.user.id, // The new staff member
          department: inviteData.department,
          role: inviteData.role,
          action: 'staff_created',
          description: `Account created by ${user.email} for ${inviteData.full_name} (${inviteData.email}) with manual password. App role: ${appRole}`,
          metadata: { 
            created_by: user.id,
            created_by_email: user.email,
            app_role: appRole,
            staff_role: inviteData.role 
          },
        });

      console.log(`Staff account created with manual password: ${authUser.user.id}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Staff account created successfully',
          password: tempPassword,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Otherwise, proceed with email invitation flow
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
        from: 'LuxuryHotelPro <noreply@luxuryhotelpro.com>',
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
        staff_id: user.id, // The person who sent the invitation
        department: inviteData.department,
        role: inviteData.role,
        action: 'staff_invited',
        description: `Invitation sent to ${inviteData.full_name} (${inviteData.email}) for role ${inviteData.role} in ${inviteData.department}`,
        metadata: { 
          invitation_id: invitation.id,
          invited_by: user.id,
          invited_email: inviteData.email 
        },
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
