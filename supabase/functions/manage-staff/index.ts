import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Validate department against enum
 */
function validateDepartment(department: string): boolean {
  const validDepartments = [
    'front_office', 'housekeeping', 'maintenance', 'food_beverage',
    'kitchen', 'bar', 'finance', 'management', 'security', 'spa',
    'concierge', 'admin'
  ];
  return validDepartments.includes(department);
}

// Generate secure random password
function generateTempPassword(length = 10): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
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
): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set, skipping email');
    return false;
  }

  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f6f9fc; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px;">
          <h1 style="color: #333; font-size: 24px; margin: 0 0 30px 0;">Welcome to ${hotelName}!</h1>
          <p style="color: #333; font-size: 16px; margin: 0 0 20px 0;">Hi ${fullName},</p>
          <p style="color: #333; font-size: 16px; margin: 0 0 20px 0;">
            Your staff account has been created. You can now access the management system.
          </p>
          <div style="background-color: #f8f9fa; border-left: 4px solid #dc2626; padding: 20px; margin: 30px 0;">
            <h3 style="margin: 0 0 15px 0; font-size: 16px;">Login Credentials</h3>
            <p style="margin: 5px 0; font-size: 14px;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 5px 0; font-size: 14px;"><strong>Temporary Password:</strong> 
              <code style="background: #fff; padding: 4px 8px; color: #dc2626; font-weight: bold;">${tempPassword}</code>
            </p>
          </div>
          <div style="margin: 30px 0;">
            <a href="${loginUrl}" style="display: inline-block; background-color: #dc2626; color: #fff; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Login to Your Account
            </a>
          </div>
          <div style="background-color: #fff3cd; border: 1px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 8px;">
            <p style="margin: 0; color: #856404; font-size: 14px;">
              <strong>⚠️ Security:</strong> You must change this password on first login.
            </p>
          </div>
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
      from: 'LuxuryHotelPro <noreply@luxuryhotelpro.com>',
      to: [email],
      subject: `Welcome to ${hotelName} - Your Account Credentials`,
      html: emailHtml,
    }),
  });

  return response.ok;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get user's tenant and role
    const { data: userRole, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !userRole) {
      throw new Error('User role not found');
    }

    const { pathname } = new URL(req.url);
    const pathParts = pathname.split('/').filter(Boolean);
    const action = pathParts[pathParts.length - 1];

    // Check permissions (only owner, manager, supervisor can manage staff)
    const allowedRoles = ['owner', 'manager', 'supervisor'];
    if (!allowedRoles.includes(userRole.role)) {
      throw new Error('Insufficient permissions');
    }

    // Route to appropriate handler
    switch (action) {
      case 'create':
        return await handleCreate(req, supabaseClient, userRole, user.id);
      case 'list':
        return await handleList(req, supabaseClient, userRole);
      case 'details':
        return await handleDetails(req, supabaseClient, userRole);
      case 'update':
        return await handleUpdate(req, supabaseClient, userRole, user.id);
      case 'status':
        return await handleStatusChange(req, supabaseClient, userRole, user.id);
      case 'remove':
        return await handleRemove(req, supabaseClient, userRole, user.id);
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: error?.message === 'Unauthorized' ? 401 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleCreate(req: Request, supabase: any, userRole: any, userId: string) {
  const body = await req.json();
  const { full_name, email, phone, department, role, supervisor_id, branch } = body;

  // Validate department
  if (!validateDepartment(department)) {
    return new Response(
      JSON.stringify({ error: `Invalid department. Must be one of: front_office, housekeeping, maintenance, food_beverage, kitchen, bar, finance, management, security, spa, concierge, admin` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Get tenant info for email
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name')
    .eq('id', userRole.tenant_id)
    .single();

  // Generate temporary password
  const tempPassword = generateTempPassword();

  // Create admin client for user creation
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Create auth user with temporary password
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      full_name,
      tenant_id: userRole.tenant_id,
      role,
      department,
    },
  });

  if (authError) {
    console.error('Error creating auth user:', authError);
    throw new Error('Failed to create user account: ' + authError.message);
  }

  if (!authUser.user) {
    throw new Error('Failed to create user account');
  }

  // Create user role
  const { error: roleInsertError } = await supabaseAdmin
    .from('user_roles')
    .insert({
      user_id: authUser.user.id,
      tenant_id: userRole.tenant_id,
      role: role,
    });

  if (roleInsertError) {
    console.error('Error creating user role:', roleInsertError);
    // Clean up auth user if role creation fails
    await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
    throw new Error('Failed to assign role');
  }

  // Create staff record linked to auth user
  const { data: staff, error: staffError } = await supabase
    .from('staff')
    .insert({
      tenant_id: userRole.tenant_id,
      user_id: authUser.user.id,
      full_name,
      email,
      phone,
      department,
      role,
      supervisor_id,
      branch,
      status: 'active',
      password_reset_required: true,
    })
    .select()
    .single();

  if (staffError) {
    console.error('Error creating staff record:', staffError);
    // Clean up auth user if staff creation fails
    await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
    throw staffError;
  }

  // Send welcome email with credentials
  const loginUrl = `${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovableproject.com')}/auth/login`;
  const emailSent = await sendWelcomeEmail(
    email,
    full_name,
    tenant?.name || 'Hotel',
    tempPassword,
    loginUrl
  );

  // Log activity
  await logActivity(supabase, {
    tenant_id: userRole.tenant_id,
    staff_id: staff.id,
    department,
    role,
    action: 'staff_created',
    description: `Staff member ${full_name} created with account`,
    metadata: { email_sent: emailSent },
  });

  console.log(`Staff created: ${staff.id}, Auth user: ${authUser.user.id}, Email sent: ${emailSent}`);

  return new Response(
    JSON.stringify({ 
      success: true, 
      data: staff,
      email_sent: emailSent,
      message: 'Staff account created successfully. Welcome email sent with login credentials.'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleList(req: Request, supabase: any, userRole: any) {
  const url = new URL(req.url);
  const department = url.searchParams.get('department');
  const role = url.searchParams.get('role');
  const status = url.searchParams.get('status');
  const search = url.searchParams.get('search');

  let query = supabase
    .from('staff')
    .select('*')
    .eq('tenant_id', userRole.tenant_id)
    .order('created_at', { ascending: false });

  if (department) query = query.eq('department', department);
  if (role) query = query.eq('role', role);
  if (status) query = query.eq('status', status);
  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) throw error;

  return new Response(
    JSON.stringify({ success: true, data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleDetails(req: Request, supabase: any, userRole: any) {
  const url = new URL(req.url);
  const staffId = url.searchParams.get('id');

  if (!staffId) {
    throw new Error('Staff ID required');
  }

  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .eq('id', staffId)
    .eq('tenant_id', userRole.tenant_id)
    .single();

  if (error) throw error;

  return new Response(
    JSON.stringify({ success: true, data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleUpdate(req: Request, supabase: any, userRole: any, userId: string) {
  const body = await req.json();
  const { id, full_name, email, phone, department, role, supervisor_id, branch } = body;

  // Validate department if being updated
  if (department && !validateDepartment(department)) {
    return new Response(
      JSON.stringify({ error: `Invalid department. Must be one of: front_office, housekeeping, maintenance, food_beverage, kitchen, bar, finance, management, security, spa, concierge, admin` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { data: staff, error: updateError } = await supabase
    .from('staff')
    .update({
      full_name,
      email,
      phone,
      department,
      role,
      supervisor_id,
      branch,
    })
    .eq('id', id)
    .eq('tenant_id', userRole.tenant_id)
    .select()
    .single();

  if (updateError) throw updateError;

  // Log activity
  await logActivity(supabase, {
    tenant_id: userRole.tenant_id,
    staff_id: id,
    department,
    role,
    action: 'staff_updated',
    description: `Staff member ${full_name} updated`,
  });

  return new Response(
    JSON.stringify({ success: true, data: staff }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleStatusChange(req: Request, supabase: any, userRole: any, userId: string) {
  const body = await req.json();
  const { id, status } = body;

  const { data: staff, error: updateError } = await supabase
    .from('staff')
    .update({ status })
    .eq('id', id)
    .eq('tenant_id', userRole.tenant_id)
    .select()
    .single();

  if (updateError) throw updateError;

  // Log activity
  await logActivity(supabase, {
    tenant_id: userRole.tenant_id,
    staff_id: id,
    department: staff.department,
    role: staff.role,
    action: 'staff_status_changed',
    description: `Staff status changed to ${status}`,
  });

  return new Response(
    JSON.stringify({ success: true, data: staff }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleRemove(req: Request, supabase: any, userRole: any, userId: string) {
  const body = await req.json();
  const { id } = body;

  // Only owners can remove staff
  if (userRole.role !== 'owner') {
    throw new Error('Only owners can remove staff');
  }

  const { error: deleteError } = await supabase
    .from('staff')
    .delete()
    .eq('id', id)
    .eq('tenant_id', userRole.tenant_id);

  if (deleteError) throw deleteError;

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function logActivity(supabase: any, activity: any) {
  await supabase.from('staff_activity').insert({
    tenant_id: activity.tenant_id,
    staff_id: activity.staff_id,
    department: activity.department,
    role: activity.role,
    action: activity.action,
    description: activity.description,
  });
}
