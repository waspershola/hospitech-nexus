-- ============================================
-- PHASE 2: INVENTORY DATABASE SCHEMA
-- ============================================

-- ============================================
-- STEP 1: CREATE ENUMS
-- ============================================

-- Item categories
CREATE TYPE item_category AS ENUM (
  'food', 'beverage', 'cleaning', 'linen', 'amenities', 
  'maintenance', 'office', 'kitchen_equipment', 'other'
);

-- Stock movement types
CREATE TYPE movement_type AS ENUM (
  'purchase', 'issue', 'return', 'transfer', 'adjustment', 
  'wastage', 'consumption', 'expired'
);

-- Request status
CREATE TYPE request_status AS ENUM (
  'pending', 'approved', 'issued', 'rejected', 'cancelled'
);

-- ============================================
-- STEP 2: CREATE CORE TABLES
-- ============================================

-- Master items catalog
CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  item_code TEXT NOT NULL,
  item_name TEXT NOT NULL,
  category item_category NOT NULL,
  unit TEXT NOT NULL,
  reorder_level NUMERIC DEFAULT 0,
  cost_price NUMERIC DEFAULT 0,
  last_purchase_price NUMERIC,
  supplier_id UUID,
  is_perishable BOOLEAN DEFAULT false,
  shelf_life_days INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, item_code)
);

-- Central store stock levels
CREATE TABLE store_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL DEFAULT 0,
  location TEXT,
  last_updated TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, item_id)
);

-- Department sub-stock
CREATE TABLE department_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  department department_type NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, item_id, department)
);

-- All stock movements (audit trail)
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  movement_type movement_type NOT NULL,
  quantity NUMERIC NOT NULL,
  source TEXT,
  destination TEXT,
  reference_no TEXT,
  unit_cost NUMERIC,
  total_value NUMERIC,
  approved_by UUID REFERENCES staff(id),
  created_by UUID NOT NULL REFERENCES staff(id),
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Department requests for items
CREATE TABLE department_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  request_number TEXT NOT NULL,
  department department_type NOT NULL,
  requested_by UUID NOT NULL REFERENCES staff(id),
  approved_by UUID REFERENCES staff(id),
  issued_by UUID REFERENCES staff(id),
  status request_status DEFAULT 'pending',
  items JSONB NOT NULL,
  purpose TEXT,
  priority TEXT DEFAULT 'normal',
  requested_at TIMESTAMPTZ DEFAULT now(),
  approved_at TIMESTAMPTZ,
  issued_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Suppliers
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  payment_terms TEXT,
  active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Purchase Orders
CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  po_number TEXT NOT NULL,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  created_by UUID NOT NULL REFERENCES staff(id),
  approved_by UUID REFERENCES staff(id),
  received_by UUID REFERENCES staff(id),
  status TEXT DEFAULT 'draft',
  items JSONB NOT NULL,
  subtotal NUMERIC,
  tax_amount NUMERIC,
  total_amount NUMERIC,
  delivery_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- STEP 3: CREATE INDEXES
-- ============================================

CREATE INDEX idx_inventory_items_tenant ON inventory_items(tenant_id);
CREATE INDEX idx_inventory_items_category ON inventory_items(category);
CREATE INDEX idx_store_stock_tenant_item ON store_stock(tenant_id, item_id);
CREATE INDEX idx_department_stock_tenant_dept ON department_stock(tenant_id, department);
CREATE INDEX idx_stock_movements_tenant ON stock_movements(tenant_id);
CREATE INDEX idx_stock_movements_item ON stock_movements(item_id);
CREATE INDEX idx_stock_movements_created_at ON stock_movements(created_at DESC);
CREATE INDEX idx_department_requests_tenant ON department_requests(tenant_id);
CREATE INDEX idx_department_requests_status ON department_requests(status);
CREATE INDEX idx_suppliers_tenant ON suppliers(tenant_id);
CREATE INDEX idx_purchase_orders_tenant ON purchase_orders(tenant_id);

-- ============================================
-- STEP 4: ENABLE RLS
-- ============================================

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 5: CREATE RLS POLICIES
-- ============================================

-- Inventory items policies
CREATE POLICY "Users can view tenant inventory items" ON inventory_items
  FOR SELECT USING (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY "Store managers can manage inventory items" ON inventory_items
  FOR ALL USING (
    tenant_id = get_user_tenant(auth.uid()) AND
    (has_role(auth.uid(), tenant_id, 'owner') OR 
     has_role(auth.uid(), tenant_id, 'manager') OR
     has_role(auth.uid(), tenant_id, 'store_manager'))
  );

-- Store stock policies
CREATE POLICY "Users can view store stock" ON store_stock
  FOR SELECT USING (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY "Store managers can manage store stock" ON store_stock
  FOR ALL USING (
    tenant_id = get_user_tenant(auth.uid()) AND
    (has_role(auth.uid(), tenant_id, 'owner') OR 
     has_role(auth.uid(), tenant_id, 'manager') OR
     has_role(auth.uid(), tenant_id, 'store_manager'))
  );

-- Department stock policies
CREATE POLICY "Users can view department stock" ON department_stock
  FOR SELECT USING (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY "Authorized staff can manage department stock" ON department_stock
  FOR ALL USING (tenant_id = get_user_tenant(auth.uid()));

-- Stock movements policies
CREATE POLICY "Users can view stock movements" ON stock_movements
  FOR SELECT USING (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY "Staff can create stock movements" ON stock_movements
  FOR INSERT WITH CHECK (tenant_id = get_user_tenant(auth.uid()));

-- Department requests policies
CREATE POLICY "Staff can view department requests" ON department_requests
  FOR SELECT USING (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY "Staff can create requests" ON department_requests
  FOR INSERT WITH CHECK (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY "Store managers can manage requests" ON department_requests
  FOR ALL USING (
    tenant_id = get_user_tenant(auth.uid()) AND
    (has_role(auth.uid(), tenant_id, 'owner') OR 
     has_role(auth.uid(), tenant_id, 'manager') OR
     has_role(auth.uid(), tenant_id, 'store_manager'))
  );

-- Suppliers policies
CREATE POLICY "Users can view suppliers" ON suppliers
  FOR SELECT USING (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY "Procurement can manage suppliers" ON suppliers
  FOR ALL USING (
    tenant_id = get_user_tenant(auth.uid()) AND
    (has_role(auth.uid(), tenant_id, 'owner') OR 
     has_role(auth.uid(), tenant_id, 'manager') OR
     has_role(auth.uid(), tenant_id, 'procurement') OR
     has_role(auth.uid(), tenant_id, 'store_manager'))
  );

-- Purchase orders policies
CREATE POLICY "Users can view purchase orders" ON purchase_orders
  FOR SELECT USING (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY "Procurement can manage purchase orders" ON purchase_orders
  FOR ALL USING (
    tenant_id = get_user_tenant(auth.uid()) AND
    (has_role(auth.uid(), tenant_id, 'owner') OR 
     has_role(auth.uid(), tenant_id, 'manager') OR
     has_role(auth.uid(), tenant_id, 'procurement') OR
     has_role(auth.uid(), tenant_id, 'store_manager'))
  );

-- ============================================
-- STEP 6: CREATE TRIGGERS
-- ============================================

CREATE TRIGGER update_inventory_items_updated_at
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_department_requests_updated_at
  BEFORE UPDATE ON department_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchase_orders_updated_at
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 7: CREATE HELPER FUNCTIONS
-- ============================================

-- Function to generate request numbers
CREATE OR REPLACE FUNCTION generate_request_number(p_tenant_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_year INTEGER;
  v_count INTEGER;
  v_number TEXT;
BEGIN
  v_year := EXTRACT(YEAR FROM CURRENT_DATE);
  
  SELECT COUNT(*) + 1 INTO v_count
  FROM department_requests
  WHERE tenant_id = p_tenant_id
    AND EXTRACT(YEAR FROM created_at) = v_year;
  
  v_number := 'REQ-' || v_year || '-' || LPAD(v_count::TEXT, 4, '0');
  RETURN v_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to check low stock items
CREATE OR REPLACE FUNCTION get_low_stock_items(p_tenant_id UUID)
RETURNS TABLE(
  item_id UUID,
  item_name TEXT,
  current_qty NUMERIC,
  reorder_level NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.item_name,
    COALESCE(s.quantity, 0),
    i.reorder_level
  FROM inventory_items i
  LEFT JOIN store_stock s ON s.item_id = i.id AND s.tenant_id = p_tenant_id
  WHERE i.tenant_id = p_tenant_id
    AND COALESCE(s.quantity, 0) <= i.reorder_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;