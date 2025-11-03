import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StockOperation {
  operation: 'receive' | 'issue' | 'return' | 'adjust' | 'wastage' | 'consumption' | 'transfer';
  item_id: string;
  quantity: number;
  source?: string;
  destination?: string;
  department?: string;
  reference_no?: string;
  unit_cost?: number;
  notes?: string;
  metadata?: Record<string, any>;
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

    // Check permissions
    const allowedRoles = ['owner', 'manager', 'store_manager'];
    if (!allowedRoles.includes(userRole.role)) {
      throw new Error('Insufficient permissions');
    }

    const operation: StockOperation = await req.json();
    console.log('Stock operation:', operation.operation, 'for item:', operation.item_id);

    // Get item details
    const { data: item, error: itemError } = await supabaseClient
      .from('inventory_items')
      .select('*')
      .eq('id', operation.item_id)
      .eq('tenant_id', userRole.tenant_id)
      .single();

    if (itemError || !item) {
      throw new Error('Item not found');
    }

    let result;
    switch (operation.operation) {
      case 'receive':
        result = await handleReceive(supabaseClient, userRole.tenant_id, staffInfo.id, item, operation);
        break;
      case 'issue':
        result = await handleIssue(supabaseClient, userRole.tenant_id, staffInfo.id, item, operation);
        break;
      case 'return':
        result = await handleReturn(supabaseClient, userRole.tenant_id, staffInfo.id, item, operation);
        break;
      case 'adjust':
      case 'wastage':
        result = await handleAdjustment(supabaseClient, userRole.tenant_id, staffInfo.id, item, operation);
        break;
      case 'consumption':
        result = await handleConsumption(supabaseClient, userRole.tenant_id, staffInfo.id, item, operation);
        break;
      case 'transfer':
        result = await handleTransfer(supabaseClient, userRole.tenant_id, staffInfo.id, item, operation);
        break;
      default:
        throw new Error('Invalid operation');
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

async function handleReceive(supabase: any, tenantId: string, staffId: string, item: any, operation: StockOperation) {
  const unitCost = operation.unit_cost || item.cost_price;
  const totalValue = operation.quantity * unitCost;

  // Update or insert store stock
  const { data: existingStock } = await supabase
    .from('store_stock')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('item_id', item.id)
    .single();

  if (existingStock) {
    await supabase
      .from('store_stock')
      .update({
        quantity: existingStock.quantity + operation.quantity,
        last_updated: new Date().toISOString(),
      })
      .eq('id', existingStock.id);
  } else {
    await supabase
      .from('store_stock')
      .insert({
        tenant_id: tenantId,
        item_id: item.id,
        quantity: operation.quantity,
      });
  }

  // Update item cost price (weighted average)
  if (operation.unit_cost) {
    const newCostPrice = existingStock
      ? ((existingStock.quantity * item.cost_price) + totalValue) / (existingStock.quantity + operation.quantity)
      : operation.unit_cost;

    await supabase
      .from('inventory_items')
      .update({
        cost_price: newCostPrice,
        last_purchase_price: operation.unit_cost,
      })
      .eq('id', item.id);
  }

  // Log movement
  const { data: movement } = await supabase
    .from('stock_movements')
    .insert({
      tenant_id: tenantId,
      item_id: item.id,
      movement_type: 'purchase',
      quantity: operation.quantity,
      source: operation.source || 'purchase',
      destination: 'store',
      reference_no: operation.reference_no,
      unit_cost: unitCost,
      total_value: totalValue,
      created_by: staffId,
      notes: operation.notes,
      metadata: operation.metadata,
    })
    .select()
    .single();

  return movement;
}

async function handleIssue(supabase: any, tenantId: string, staffId: string, item: any, operation: StockOperation) {
  if (!operation.department) {
    throw new Error('Department is required for issue operation');
  }

  // Check store stock
  const { data: storeStock } = await supabase
    .from('store_stock')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('item_id', item.id)
    .single();

  if (!storeStock || storeStock.quantity < operation.quantity) {
    throw new Error('Insufficient stock in store');
  }

  // Deduct from store stock
  await supabase
    .from('store_stock')
    .update({
      quantity: storeStock.quantity - operation.quantity,
      last_updated: new Date().toISOString(),
    })
    .eq('id', storeStock.id);

  // Add to department stock
  const { data: deptStock } = await supabase
    .from('department_stock')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('item_id', item.id)
    .eq('department', operation.department)
    .single();

  if (deptStock) {
    await supabase
      .from('department_stock')
      .update({
        quantity: deptStock.quantity + operation.quantity,
        last_updated: new Date().toISOString(),
      })
      .eq('id', deptStock.id);
  } else {
    await supabase
      .from('department_stock')
      .insert({
        tenant_id: tenantId,
        item_id: item.id,
        department: operation.department,
        quantity: operation.quantity,
      });
  }

  // Log movement
  const totalValue = operation.quantity * item.cost_price;
  const { data: movement } = await supabase
    .from('stock_movements')
    .insert({
      tenant_id: tenantId,
      item_id: item.id,
      movement_type: 'issue',
      quantity: operation.quantity,
      source: 'store',
      destination: operation.department,
      reference_no: operation.reference_no,
      unit_cost: item.cost_price,
      total_value: totalValue,
      created_by: staffId,
      notes: operation.notes,
      metadata: operation.metadata,
    })
    .select()
    .single();

  return movement;
}

async function handleReturn(supabase: any, tenantId: string, staffId: string, item: any, operation: StockOperation) {
  if (!operation.department) {
    throw new Error('Department is required for return operation');
  }

  // Check department stock
  const { data: deptStock } = await supabase
    .from('department_stock')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('item_id', item.id)
    .eq('department', operation.department)
    .single();

  if (!deptStock || deptStock.quantity < operation.quantity) {
    throw new Error('Insufficient stock in department');
  }

  // Deduct from department stock
  await supabase
    .from('department_stock')
    .update({
      quantity: deptStock.quantity - operation.quantity,
      last_updated: new Date().toISOString(),
    })
    .eq('id', deptStock.id);

  // Add back to store stock
  const { data: storeStock } = await supabase
    .from('store_stock')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('item_id', item.id)
    .single();

  await supabase
    .from('store_stock')
    .update({
      quantity: storeStock.quantity + operation.quantity,
      last_updated: new Date().toISOString(),
    })
    .eq('id', storeStock.id);

  // Log movement
  const totalValue = operation.quantity * item.cost_price;
  const { data: movement } = await supabase
    .from('stock_movements')
    .insert({
      tenant_id: tenantId,
      item_id: item.id,
      movement_type: 'return',
      quantity: operation.quantity,
      source: operation.department,
      destination: 'store',
      reference_no: operation.reference_no,
      unit_cost: item.cost_price,
      total_value: totalValue,
      created_by: staffId,
      notes: operation.notes,
      metadata: operation.metadata,
    })
    .select()
    .single();

  return movement;
}

async function handleAdjustment(supabase: any, tenantId: string, staffId: string, item: any, operation: StockOperation) {
  const movementType = operation.operation === 'wastage' ? 'wastage' : 'adjustment';

  // Update store stock
  const { data: storeStock } = await supabase
    .from('store_stock')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('item_id', item.id)
    .single();

  if (!storeStock) {
    throw new Error('Stock not found');
  }

  if (storeStock.quantity < operation.quantity) {
    throw new Error('Adjustment quantity exceeds available stock');
  }

  await supabase
    .from('store_stock')
    .update({
      quantity: storeStock.quantity - operation.quantity,
      last_updated: new Date().toISOString(),
    })
    .eq('id', storeStock.id);

  // Log movement
  const totalValue = operation.quantity * item.cost_price;
  const { data: movement } = await supabase
    .from('stock_movements')
    .insert({
      tenant_id: tenantId,
      item_id: item.id,
      movement_type: movementType,
      quantity: operation.quantity,
      source: 'store',
      destination: movementType,
      reference_no: operation.reference_no,
      unit_cost: item.cost_price,
      total_value: totalValue,
      created_by: staffId,
      notes: operation.notes,
      metadata: operation.metadata,
    })
    .select()
    .single();

  return movement;
}

async function handleConsumption(supabase: any, tenantId: string, staffId: string, item: any, operation: StockOperation) {
  if (!operation.department) {
    throw new Error('Department is required for consumption');
  }

  // Check and update department stock
  const { data: deptStock } = await supabase
    .from('department_stock')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('item_id', item.id)
    .eq('department', operation.department)
    .single();

  if (!deptStock || deptStock.quantity < operation.quantity) {
    throw new Error('Insufficient stock in department');
  }

  await supabase
    .from('department_stock')
    .update({
      quantity: deptStock.quantity - operation.quantity,
      last_updated: new Date().toISOString(),
    })
    .eq('id', deptStock.id);

  // Log movement
  const totalValue = operation.quantity * item.cost_price;
  const { data: movement } = await supabase
    .from('stock_movements')
    .insert({
      tenant_id: tenantId,
      item_id: item.id,
      movement_type: 'consumption',
      quantity: operation.quantity,
      source: operation.department,
      destination: 'consumption',
      reference_no: operation.reference_no,
      unit_cost: item.cost_price,
      total_value: totalValue,
      created_by: staffId,
      notes: operation.notes,
      metadata: operation.metadata,
    })
    .select()
    .single();

  return movement;
}

async function handleTransfer(supabase: any, tenantId: string, staffId: string, item: any, operation: StockOperation) {
  if (!operation.source || !operation.destination) {
    throw new Error('Source and destination departments are required for transfer');
  }

  // Check source department stock
  const { data: sourceStock } = await supabase
    .from('department_stock')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('item_id', item.id)
    .eq('department', operation.source)
    .single();

  if (!sourceStock || sourceStock.quantity < operation.quantity) {
    throw new Error('Insufficient stock in source department');
  }

  // Deduct from source
  await supabase
    .from('department_stock')
    .update({
      quantity: sourceStock.quantity - operation.quantity,
      last_updated: new Date().toISOString(),
    })
    .eq('id', sourceStock.id);

  // Add to destination
  const { data: destStock } = await supabase
    .from('department_stock')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('item_id', item.id)
    .eq('department', operation.destination)
    .single();

  if (destStock) {
    await supabase
      .from('department_stock')
      .update({
        quantity: destStock.quantity + operation.quantity,
        last_updated: new Date().toISOString(),
      })
      .eq('id', destStock.id);
  } else {
    await supabase
      .from('department_stock')
      .insert({
        tenant_id: tenantId,
        item_id: item.id,
        department: operation.destination,
        quantity: operation.quantity,
      });
  }

  // Log movement
  const totalValue = operation.quantity * item.cost_price;
  const { data: movement } = await supabase
    .from('stock_movements')
    .insert({
      tenant_id: tenantId,
      item_id: item.id,
      movement_type: 'transfer',
      quantity: operation.quantity,
      source: operation.source,
      destination: operation.destination,
      reference_no: operation.reference_no,
      unit_cost: item.cost_price,
      total_value: totalValue,
      created_by: staffId,
      notes: operation.notes,
      metadata: operation.metadata,
    })
    .select()
    .single();

  return movement;
}