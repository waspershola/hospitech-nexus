import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestItem {
  item_id: string;
  requested_qty: number;
  issued_qty?: number;
}

interface DepartmentRequestPayload {
  action: 'create' | 'approve' | 'issue' | 'reject' | 'cancel';
  request_id?: string;
  department?: string;
  items?: RequestItem[];
  purpose?: string;
  priority?: 'urgent' | 'normal' | 'low';
  notes?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Get authenticated user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get user's tenant, role, and staff info
    const { data: userRole, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !userRole) {
      throw new Error('User role not found');
    }

    const { data: staffInfo } = await supabaseClient
      .from('staff')
      .select('id, department')
      .eq('user_id', user.id)
      .eq('tenant_id', userRole.tenant_id)
      .single();

    if (!staffInfo) {
      throw new Error('Staff record not found');
    }

    const payload: DepartmentRequestPayload = await req.json();
    console.log('Department request action:', payload.action);

    let result;
    switch (payload.action) {
      case 'create':
        result = await handleCreate(supabaseClient, userRole.tenant_id, staffInfo, payload);
        break;
      case 'approve':
        // Only owner, manager, store_manager can approve
        if (!['owner', 'manager', 'store_manager'].includes(userRole.role)) {
          throw new Error('Insufficient permissions to approve requests');
        }
        result = await handleApprove(supabaseClient, userRole.tenant_id, staffInfo.id, payload);
        break;
      case 'issue':
        // Only owner, manager, store_manager can issue
        if (!['owner', 'manager', 'store_manager'].includes(userRole.role)) {
          throw new Error('Insufficient permissions to issue items');
        }
        result = await handleIssue(supabaseClient, userRole.tenant_id, staffInfo.id, payload);
        break;
      case 'reject':
        if (!['owner', 'manager', 'store_manager'].includes(userRole.role)) {
          throw new Error('Insufficient permissions to reject requests');
        }
        result = await handleReject(supabaseClient, userRole.tenant_id, staffInfo.id, payload);
        break;
      case 'cancel':
        result = await handleCancel(supabaseClient, userRole.tenant_id, staffInfo.id, payload);
        break;
      default:
        throw new Error('Invalid action');
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleCreate(supabase: any, tenantId: string, staffInfo: any, payload: DepartmentRequestPayload) {
  if (!payload.department || !payload.items || payload.items.length === 0) {
    throw new Error('Department and items are required');
  }

  // Generate request number
  const { data: requestNumber } = await supabase.rpc('generate_request_number', {
    p_tenant_id: tenantId,
  });

  // Validate all items exist
  const itemIds = payload.items.map(item => item.item_id);
  const { data: items, error: itemsError } = await supabase
    .from('inventory_items')
    .select('id, item_name')
    .eq('tenant_id', tenantId)
    .in('id', itemIds);

  if (itemsError || items.length !== itemIds.length) {
    throw new Error('One or more items not found');
  }

  // Create request
  const { data: request, error: requestError } = await supabase
    .from('department_requests')
    .insert({
      tenant_id: tenantId,
      request_number: requestNumber,
      department: payload.department,
      requested_by: staffInfo.id,
      items: payload.items,
      purpose: payload.purpose,
      priority: payload.priority || 'normal',
      status: 'pending',
    })
    .select()
    .single();

  if (requestError) {
    throw requestError;
  }

  console.log('Request created:', request.request_number);
  return request;
}

async function handleApprove(supabase: any, tenantId: string, staffId: string, payload: DepartmentRequestPayload) {
  if (!payload.request_id) {
    throw new Error('Request ID is required');
  }

  const { data: request, error: fetchError } = await supabase
    .from('department_requests')
    .select('*')
    .eq('id', payload.request_id)
    .eq('tenant_id', tenantId)
    .single();

  if (fetchError || !request) {
    throw new Error('Request not found');
  }

  if (request.status !== 'pending') {
    throw new Error('Request is not in pending status');
  }

  const { data: updated, error: updateError } = await supabase
    .from('department_requests')
    .update({
      status: 'approved',
      approved_by: staffId,
      approved_at: new Date().toISOString(),
    })
    .eq('id', payload.request_id)
    .select()
    .single();

  if (updateError) {
    throw updateError;
  }

  console.log('Request approved:', request.request_number);
  return updated;
}

async function handleIssue(supabase: any, tenantId: string, staffId: string, payload: DepartmentRequestPayload) {
  if (!payload.request_id) {
    throw new Error('Request ID is required');
  }

  const { data: request, error: fetchError } = await supabase
    .from('department_requests')
    .select('*')
    .eq('id', payload.request_id)
    .eq('tenant_id', tenantId)
    .single();

  if (fetchError || !request) {
    throw new Error('Request not found');
  }

  if (request.status !== 'approved') {
    throw new Error('Request must be approved before issuing');
  }

  // Process each item
  const items = request.items as RequestItem[];
  for (const item of items) {
    const qtyToIssue = item.issued_qty || item.requested_qty;

    // Get item details
    const { data: inventoryItem } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('id', item.item_id)
      .eq('tenant_id', tenantId)
      .single();

    if (!inventoryItem) {
      throw new Error(`Item ${item.item_id} not found`);
    }

    // Check store stock
    const { data: storeStock } = await supabase
      .from('store_stock')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('item_id', item.item_id)
      .single();

    if (!storeStock || storeStock.quantity < qtyToIssue) {
      throw new Error(`Insufficient stock for ${inventoryItem.item_name}`);
    }

    // Deduct from store stock
    await supabase
      .from('store_stock')
      .update({
        quantity: storeStock.quantity - qtyToIssue,
        last_updated: new Date().toISOString(),
      })
      .eq('id', storeStock.id);

    // Add to department stock
    const { data: deptStock } = await supabase
      .from('department_stock')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('item_id', item.item_id)
      .eq('department', request.department)
      .single();

    if (deptStock) {
      await supabase
        .from('department_stock')
        .update({
          quantity: deptStock.quantity + qtyToIssue,
          last_updated: new Date().toISOString(),
        })
        .eq('id', deptStock.id);
    } else {
      await supabase
        .from('department_stock')
        .insert({
          tenant_id: tenantId,
          item_id: item.item_id,
          department: request.department,
          quantity: qtyToIssue,
        });
    }

    // Log movement
    const totalValue = qtyToIssue * inventoryItem.cost_price;
    await supabase
      .from('stock_movements')
      .insert({
        tenant_id: tenantId,
        item_id: item.item_id,
        movement_type: 'issue',
        quantity: qtyToIssue,
        source: 'store',
        destination: request.department,
        reference_no: request.request_number,
        unit_cost: inventoryItem.cost_price,
        total_value: totalValue,
        approved_by: request.approved_by,
        created_by: staffId,
        notes: `Issued via request ${request.request_number}`,
      });
  }

  // Update request status
  const { data: updated, error: updateError } = await supabase
    .from('department_requests')
    .update({
      status: 'issued',
      issued_by: staffId,
      issued_at: new Date().toISOString(),
    })
    .eq('id', payload.request_id)
    .select()
    .single();

  if (updateError) {
    throw updateError;
  }

  console.log('Request issued:', request.request_number);
  return updated;
}

async function handleReject(supabase: any, tenantId: string, staffId: string, payload: DepartmentRequestPayload) {
  if (!payload.request_id) {
    throw new Error('Request ID is required');
  }

  const { data: request, error: fetchError } = await supabase
    .from('department_requests')
    .select('*')
    .eq('id', payload.request_id)
    .eq('tenant_id', tenantId)
    .single();

  if (fetchError || !request) {
    throw new Error('Request not found');
  }

  if (request.status !== 'pending' && request.status !== 'approved') {
    throw new Error('Cannot reject request in current status');
  }

  const { data: updated, error: updateError } = await supabase
    .from('department_requests')
    .update({
      status: 'rejected',
      approved_by: staffId,
      approved_at: new Date().toISOString(),
    })
    .eq('id', payload.request_id)
    .select()
    .single();

  if (updateError) {
    throw updateError;
  }

  console.log('Request rejected:', request.request_number);
  return updated;
}

async function handleCancel(supabase: any, tenantId: string, staffId: string, payload: DepartmentRequestPayload) {
  if (!payload.request_id) {
    throw new Error('Request ID is required');
  }

  const { data: request, error: fetchError } = await supabase
    .from('department_requests')
    .select('*')
    .eq('id', payload.request_id)
    .eq('tenant_id', tenantId)
    .eq('requested_by', staffId)
    .single();

  if (fetchError || !request) {
    throw new Error('Request not found or you are not authorized to cancel it');
  }

  if (request.status !== 'pending') {
    throw new Error('Only pending requests can be cancelled');
  }

  const { data: updated, error: updateError } = await supabase
    .from('department_requests')
    .update({
      status: 'cancelled',
    })
    .eq('id', payload.request_id)
    .select()
    .single();

  if (updateError) {
    throw updateError;
  }

  console.log('Request cancelled:', request.request_number);
  return updated;
}