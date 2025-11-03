import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReportParams {
  report_type: 'stock_valuation' | 'movement_history' | 'department_consumption' | 'low_stock' | 'expiry_alerts' | 'supplier_performance';
  start_date?: string;
  end_date?: string;
  department?: string;
  category?: string;
  supplier_id?: string;
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

    // Get user's tenant and role
    const { data: userRole, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !userRole) {
      throw new Error('User role not found');
    }

    // Check permissions
    const allowedRoles = ['owner', 'manager', 'store_manager', 'accountant'];
    if (!allowedRoles.includes(userRole.role)) {
      throw new Error('Insufficient permissions');
    }

    const params: ReportParams = await req.json();
    console.log('Generating report:', params.report_type);

    let report;
    switch (params.report_type) {
      case 'stock_valuation':
        report = await generateStockValuation(supabaseClient, userRole.tenant_id, params);
        break;
      case 'movement_history':
        report = await generateMovementHistory(supabaseClient, userRole.tenant_id, params);
        break;
      case 'department_consumption':
        report = await generateDepartmentConsumption(supabaseClient, userRole.tenant_id, params);
        break;
      case 'low_stock':
        report = await generateLowStockReport(supabaseClient, userRole.tenant_id, params);
        break;
      case 'expiry_alerts':
        report = await generateExpiryAlerts(supabaseClient, userRole.tenant_id, params);
        break;
      case 'supplier_performance':
        report = await generateSupplierPerformance(supabaseClient, userRole.tenant_id, params);
        break;
      default:
        throw new Error('Invalid report type');
    }

    return new Response(
      JSON.stringify({ success: true, data: report }),
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

async function generateStockValuation(supabase: any, tenantId: string, params: ReportParams) {
  let query = supabase
    .from('inventory_items')
    .select(`
      id,
      item_code,
      item_name,
      category,
      unit,
      cost_price,
      store_stock (quantity)
    `)
    .eq('tenant_id', tenantId);

  if (params.category) {
    query = query.eq('category', params.category);
  }

  const { data: items, error } = await query;

  if (error) throw error;

  // Calculate totals
  const report = items.map((item: any) => {
    const quantity = item.store_stock?.[0]?.quantity || 0;
    const value = quantity * item.cost_price;
    return {
      item_code: item.item_code,
      item_name: item.item_name,
      category: item.category,
      unit: item.unit,
      quantity,
      cost_price: item.cost_price,
      total_value: value,
    };
  });

  const totalValue = report.reduce((sum: number, item: any) => sum + item.total_value, 0);
  const categoryBreakdown = report.reduce((acc: any, item: any) => {
    if (!acc[item.category]) {
      acc[item.category] = { items: 0, value: 0 };
    }
    acc[item.category].items++;
    acc[item.category].value += item.total_value;
    return acc;
  }, {});

  return {
    items: report,
    summary: {
      total_items: items.length,
      total_value: totalValue,
      category_breakdown: categoryBreakdown,
    },
  };
}

async function generateMovementHistory(supabase: any, tenantId: string, params: ReportParams) {
  let query = supabase
    .from('stock_movements')
    .select(`
      id,
      created_at,
      movement_type,
      quantity,
      source,
      destination,
      reference_no,
      unit_cost,
      total_value,
      notes,
      inventory_items (item_code, item_name, category),
      staff:created_by (full_name)
    `)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (params.start_date) {
    query = query.gte('created_at', params.start_date);
  }
  if (params.end_date) {
    query = query.lte('created_at', params.end_date);
  }
  if (params.department) {
    query = query.or(`source.eq.${params.department},destination.eq.${params.department}`);
  }

  const { data: movements, error } = await query;

  if (error) throw error;

  const summary = {
    total_movements: movements.length,
    by_type: movements.reduce((acc: any, m: any) => {
      acc[m.movement_type] = (acc[m.movement_type] || 0) + 1;
      return acc;
    }, {}),
    total_value: movements.reduce((sum: number, m: any) => sum + (m.total_value || 0), 0),
  };

  return {
    movements,
    summary,
  };
}

async function generateDepartmentConsumption(supabase: any, tenantId: string, params: ReportParams) {
  let query = supabase
    .from('stock_movements')
    .select(`
      id,
      created_at,
      quantity,
      total_value,
      destination,
      inventory_items (item_code, item_name, category, unit)
    `)
    .eq('tenant_id', tenantId)
    .in('movement_type', ['issue', 'consumption'])
    .order('created_at', { ascending: false });

  if (params.start_date) {
    query = query.gte('created_at', params.start_date);
  }
  if (params.end_date) {
    query = query.lte('created_at', params.end_date);
  }
  if (params.department) {
    query = query.eq('destination', params.department);
  }

  const { data: movements, error } = await query;

  if (error) throw error;

  // Group by department
  const byDepartment = movements.reduce((acc: any, m: any) => {
    const dept = m.destination;
    if (!acc[dept]) {
      acc[dept] = {
        total_items: 0,
        total_value: 0,
        items: [],
      };
    }
    acc[dept].total_items++;
    acc[dept].total_value += m.total_value || 0;
    acc[dept].items.push({
      item: m.inventory_items,
      quantity: m.quantity,
      value: m.total_value,
      date: m.created_at,
    });
    return acc;
  }, {});

  return {
    by_department: byDepartment,
    summary: {
      total_movements: movements.length,
      total_value: movements.reduce((sum: number, m: any) => sum + (m.total_value || 0), 0),
    },
  };
}

async function generateLowStockReport(supabase: any, tenantId: string, params: ReportParams) {
  const { data: lowStockItems, error } = await supabase.rpc('get_low_stock_items', {
    p_tenant_id: tenantId,
  });

  if (error) throw error;

  return {
    items: lowStockItems,
    summary: {
      total_low_stock: lowStockItems.length,
      critical: lowStockItems.filter((item: any) => item.current_qty === 0).length,
      warning: lowStockItems.filter((item: any) => item.current_qty > 0 && item.current_qty <= item.reorder_level).length,
    },
  };
}

async function generateExpiryAlerts(supabase: any, tenantId: string, params: ReportParams) {
  const { data: items, error } = await supabase
    .from('inventory_items')
    .select(`
      id,
      item_code,
      item_name,
      is_perishable,
      shelf_life_days,
      store_stock (quantity),
      stock_movements!inner (created_at, movement_type)
    `)
    .eq('tenant_id', tenantId)
    .eq('is_perishable', true)
    .eq('stock_movements.movement_type', 'purchase')
    .order('stock_movements(created_at)', { ascending: false });

  if (error) throw error;

  const expiryAlerts = items
    .filter((item: any) => item.shelf_life_days && item.stock_movements.length > 0)
    .map((item: any) => {
      const lastReceived = new Date(item.stock_movements[0].created_at);
      const expiryDate = new Date(lastReceived);
      expiryDate.setDate(expiryDate.getDate() + item.shelf_life_days);
      
      const today = new Date();
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        item_code: item.item_code,
        item_name: item.item_name,
        quantity: item.store_stock?.[0]?.quantity || 0,
        last_received: lastReceived,
        expiry_date: expiryDate,
        days_until_expiry: daysUntilExpiry,
        status: daysUntilExpiry < 0 ? 'expired' : daysUntilExpiry <= 7 ? 'critical' : 'warning',
      };
    })
    .filter((item: any) => item.days_until_expiry <= 30); // Show items expiring within 30 days

  return {
    items: expiryAlerts.sort((a: any, b: any) => a.days_until_expiry - b.days_until_expiry),
    summary: {
      expired: expiryAlerts.filter((item: any) => item.status === 'expired').length,
      critical: expiryAlerts.filter((item: any) => item.status === 'critical').length,
      warning: expiryAlerts.filter((item: any) => item.status === 'warning').length,
    },
  };
}

async function generateSupplierPerformance(supabase: any, tenantId: string, params: ReportParams) {
  let query = supabase
    .from('purchase_orders')
    .select(`
      id,
      po_number,
      status,
      total_amount,
      delivery_date,
      created_at,
      suppliers (id, name)
    `)
    .eq('tenant_id', tenantId);

  if (params.supplier_id) {
    query = query.eq('supplier_id', params.supplier_id);
  }
  if (params.start_date) {
    query = query.gte('created_at', params.start_date);
  }
  if (params.end_date) {
    query = query.lte('created_at', params.end_date);
  }

  const { data: orders, error } = await query;

  if (error) throw error;

  // Group by supplier
  const bySupplier = orders.reduce((acc: any, po: any) => {
    const supplierId = po.suppliers.id;
    if (!acc[supplierId]) {
      acc[supplierId] = {
        supplier_name: po.suppliers.name,
        total_orders: 0,
        total_value: 0,
        completed: 0,
        pending: 0,
        cancelled: 0,
      };
    }
    acc[supplierId].total_orders++;
    acc[supplierId].total_value += po.total_amount || 0;
    if (po.status === 'received') acc[supplierId].completed++;
    if (po.status === 'draft' || po.status === 'submitted') acc[supplierId].pending++;
    if (po.status === 'cancelled') acc[supplierId].cancelled++;
    return acc;
  }, {});

  return {
    by_supplier: bySupplier,
    summary: {
      total_suppliers: Object.keys(bySupplier).length,
      total_orders: orders.length,
      total_value: orders.reduce((sum: number, po: any) => sum + (po.total_amount || 0), 0),
    },
  };
}