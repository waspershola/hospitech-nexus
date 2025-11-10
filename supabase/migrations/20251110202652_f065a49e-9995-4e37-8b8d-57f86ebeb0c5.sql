-- Create laundry_items table for laundry service management
CREATE TABLE IF NOT EXISTS laundry_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'clothing', 'bedding', 'curtains', 'accessories'
  service_type TEXT NOT NULL, -- 'wash_only', 'wash_iron', 'dry_clean', 'iron_only'
  price NUMERIC NOT NULL,
  currency VARCHAR DEFAULT 'NGN',
  turnaround_time VARCHAR, -- '24 hours', '48 hours', 'express'
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  status TEXT DEFAULT 'approved',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_laundry_items_tenant_id ON laundry_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_laundry_items_status ON laundry_items(status);
CREATE INDEX IF NOT EXISTS idx_laundry_items_category ON laundry_items(category);

-- Enable RLS
ALTER TABLE laundry_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for laundry_items
CREATE POLICY "Guests can view approved laundry items"
ON laundry_items
FOR SELECT
USING (status = 'approved' AND is_available = true);

CREATE POLICY "Staff can view all laundry items in their tenant"
ON laundry_items
FOR SELECT
USING (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY "Staff can manage laundry items"
ON laundry_items
FOR ALL
USING (
  tenant_id = get_user_tenant(auth.uid()) AND
  (has_role(auth.uid(), tenant_id, 'owner') OR 
   has_role(auth.uid(), tenant_id, 'manager') OR
   has_role(auth.uid(), tenant_id, 'housekeeping'))
);

-- Create spa_services table for spa bookings
CREATE TABLE IF NOT EXISTS spa_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'massage', 'facial', 'body_treatment', 'manicure_pedicure', 'aromatherapy'
  description TEXT,
  duration VARCHAR, -- '30 mins', '60 mins', '90 mins', '120 mins'
  price NUMERIC NOT NULL,
  currency VARCHAR DEFAULT 'NGN',
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  status TEXT DEFAULT 'approved',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_spa_services_tenant_id ON spa_services(tenant_id);
CREATE INDEX IF NOT EXISTS idx_spa_services_status ON spa_services(status);
CREATE INDEX IF NOT EXISTS idx_spa_services_category ON spa_services(category);

-- Enable RLS
ALTER TABLE spa_services ENABLE ROW LEVEL SECURITY;

-- RLS Policies for spa_services
CREATE POLICY "Guests can view approved spa services"
ON spa_services
FOR SELECT
USING (status = 'approved' AND is_available = true);

CREATE POLICY "Staff can view all spa services in their tenant"
ON spa_services
FOR SELECT
USING (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY "Staff can manage spa services"
ON spa_services
FOR ALL
USING (
  tenant_id = get_user_tenant(auth.uid()) AND
  (has_role(auth.uid(), tenant_id, 'owner') OR 
   has_role(auth.uid(), tenant_id, 'manager') OR
   has_role(auth.uid(), tenant_id, 'spa'))
);

-- Add comments for documentation
COMMENT ON TABLE laundry_items IS 'Stores laundry service items with pricing and turnaround times';
COMMENT ON TABLE spa_services IS 'Stores spa service offerings with duration and pricing';

COMMENT ON COLUMN laundry_items.service_type IS 'Type of laundry service: wash_only, wash_iron, dry_clean, iron_only';
COMMENT ON COLUMN spa_services.category IS 'Spa service category: massage, facial, body_treatment, manicure_pedicure, aromatherapy';