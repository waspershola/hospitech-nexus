-- HOTEL-SERVICES-V1: Create database-driven service catalog table

-- Create enum for service categories
CREATE TYPE service_category AS ENUM (
  'room_service',
  'bar',
  'fb',
  'spa',
  'laundry',
  'minibar',
  'transport',
  'misc'
);

-- Create hotel_services table
CREATE TABLE hotel_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category service_category NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  default_amount NUMERIC NOT NULL DEFAULT 0,
  taxable BOOLEAN NOT NULL DEFAULT true,
  active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE hotel_services ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view services in their tenant"
  ON hotel_services FOR SELECT
  USING (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY "Managers can insert services"
  ON hotel_services FOR INSERT
  WITH CHECK (
    tenant_id = get_user_tenant(auth.uid()) AND
    (has_role(auth.uid(), tenant_id, 'owner'::app_role) OR 
     has_role(auth.uid(), tenant_id, 'manager'::app_role))
  );

CREATE POLICY "Managers can update services"
  ON hotel_services FOR UPDATE
  USING (
    tenant_id = get_user_tenant(auth.uid()) AND
    (has_role(auth.uid(), tenant_id, 'owner'::app_role) OR 
     has_role(auth.uid(), tenant_id, 'manager'::app_role))
  );

CREATE POLICY "Managers can delete services"
  ON hotel_services FOR DELETE
  USING (
    tenant_id = get_user_tenant(auth.uid()) AND
    (has_role(auth.uid(), tenant_id, 'owner'::app_role) OR 
     has_role(auth.uid(), tenant_id, 'manager'::app_role))
  );

-- Indexes for performance
CREATE INDEX idx_hotel_services_tenant_id ON hotel_services(tenant_id);
CREATE INDEX idx_hotel_services_category ON hotel_services(category);
CREATE INDEX idx_hotel_services_active ON hotel_services(active);

-- Trigger for updated_at
CREATE TRIGGER update_hotel_services_updated_at
  BEFORE UPDATE ON hotel_services
  FOR EACH ROW
  EXECUTE FUNCTION update_tenants_updated_at();

-- Insert default services for all existing tenants
INSERT INTO hotel_services (tenant_id, category, name, description, default_amount, display_order)
SELECT 
  t.id,
  'room_service'::service_category,
  'Room Service',
  'General room service',
  0,
  1
FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM hotel_services WHERE tenant_id = t.id);

INSERT INTO hotel_services (tenant_id, category, name, description, default_amount, display_order)
SELECT 
  t.id,
  'bar'::service_category,
  'Bar',
  'Bar charges',
  0,
  2
FROM tenants t;

INSERT INTO hotel_services (tenant_id, category, name, description, default_amount, display_order)
SELECT 
  t.id,
  'fb'::service_category,
  'Food & Beverage',
  'Restaurant and dining',
  0,
  3
FROM tenants t;

INSERT INTO hotel_services (tenant_id, category, name, description, default_amount, display_order)
SELECT 
  t.id,
  'laundry'::service_category,
  'Laundry',
  'Laundry service',
  0,
  4
FROM tenants t;

INSERT INTO hotel_services (tenant_id, category, name, description, default_amount, display_order)
SELECT 
  t.id,
  'minibar'::service_category,
  'Minibar',
  'In-room minibar',
  0,
  5
FROM tenants t;

INSERT INTO hotel_services (tenant_id, category, name, description, default_amount, display_order)
SELECT 
  t.id,
  'spa'::service_category,
  'Spa',
  'Spa and wellness',
  0,
  6
FROM tenants t;

INSERT INTO hotel_services (tenant_id, category, name, description, default_amount, display_order)
SELECT 
  t.id,
  'transport'::service_category,
  'Transport',
  'Transportation services',
  0,
  7
FROM tenants t;