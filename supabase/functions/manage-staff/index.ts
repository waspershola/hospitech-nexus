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
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: error.message === 'Unauthorized' ? 401 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleCreate(req: Request, supabase: any, userRole: any, userId: string) {
  const body = await req.json();
  const { full_name, email, phone, department, role, supervisor_id, branch } = body;

  // Create staff record
  const { data: staff, error: staffError } = await supabase
    .from('staff')
    .insert({
      tenant_id: userRole.tenant_id,
      user_id: userId,
      full_name,
      email,
      phone,
      department,
      role,
      supervisor_id,
      branch,
      status: 'active',
    })
    .select()
    .single();

  if (staffError) throw staffError;

  // Log activity
  await logActivity(supabase, {
    tenant_id: userRole.tenant_id,
    staff_id: staff.id,
    department,
    role,
    action: 'staff_created',
    description: `Staff member ${full_name} created`,
  });

  return new Response(
    JSON.stringify({ success: true, data: staff }),
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
