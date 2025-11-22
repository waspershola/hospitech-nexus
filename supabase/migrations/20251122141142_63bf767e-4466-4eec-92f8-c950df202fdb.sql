-- Create QR Services Catalog Table for tenant-specific QR service configuration
CREATE TABLE IF NOT EXISTS hotel_qr_services_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  service_key TEXT NOT NULL,
  service_label TEXT NOT NULL,
  category TEXT,
  active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, service_key)
);

-- Enable RLS
ALTER TABLE hotel_qr_services_catalog ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view QR services for their tenant"
  ON hotel_qr_services_catalog FOR SELECT
  USING (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY "Managers can insert QR services"
  ON hotel_qr_services_catalog FOR INSERT
  WITH CHECK (
    tenant_id = get_user_tenant(auth.uid()) AND
    (has_role(auth.uid(), tenant_id, 'owner'::app_role) OR 
     has_role(auth.uid(), tenant_id, 'manager'::app_role))
  );

CREATE POLICY "Managers can update QR services"
  ON hotel_qr_services_catalog FOR UPDATE
  USING (
    tenant_id = get_user_tenant(auth.uid()) AND
    (has_role(auth.uid(), tenant_id, 'owner'::app_role) OR 
     has_role(auth.uid(), tenant_id, 'manager'::app_role))
  );

CREATE POLICY "Managers can delete QR services"
  ON hotel_qr_services_catalog FOR DELETE
  USING (
    tenant_id = get_user_tenant(auth.uid()) AND
    (has_role(auth.uid(), tenant_id, 'owner'::app_role) OR 
     has_role(auth.uid(), tenant_id, 'manager'::app_role))
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_hotel_qr_services_catalog_tenant_id ON hotel_qr_services_catalog(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hotel_qr_services_catalog_active ON hotel_qr_services_catalog(active);

-- Trigger for updated_at
CREATE TRIGGER update_hotel_qr_services_catalog_updated_at
  BEFORE UPDATE ON hotel_qr_services_catalog
  FOR EACH ROW
  EXECUTE FUNCTION update_tenants_updated_at();

-- Insert default QR services for all existing tenants
INSERT INTO hotel_qr_services_catalog (tenant_id, service_key, service_label, category, display_order, icon)
SELECT t.id, 'digital_menu', 'Digital Menu', 'food_beverage', 1, 'MenuSquare' FROM tenants t
ON CONFLICT (tenant_id, service_key) DO NOTHING;

INSERT INTO hotel_qr_services_catalog (tenant_id, service_key, service_label, category, display_order, icon)
SELECT t.id, 'wifi', 'WiFi Access', 'technology', 2, 'Wifi' FROM tenants t
ON CONFLICT (tenant_id, service_key) DO NOTHING;

INSERT INTO hotel_qr_services_catalog (tenant_id, service_key, service_label, category, display_order, icon)
SELECT t.id, 'room_service', 'Room Service', 'food_beverage', 3, 'Utensils' FROM tenants t
ON CONFLICT (tenant_id, service_key) DO NOTHING;

INSERT INTO hotel_qr_services_catalog (tenant_id, service_key, service_label, category, display_order, icon)
SELECT t.id, 'housekeeping', 'Housekeeping', 'housekeeping', 4, 'Sparkles' FROM tenants t
ON CONFLICT (tenant_id, service_key) DO NOTHING;

INSERT INTO hotel_qr_services_catalog (tenant_id, service_key, service_label, category, display_order, icon)
SELECT t.id, 'maintenance', 'Maintenance', 'facilities', 5, 'Wrench' FROM tenants t
ON CONFLICT (tenant_id, service_key) DO NOTHING;

INSERT INTO hotel_qr_services_catalog (tenant_id, service_key, service_label, category, display_order, icon)
SELECT t.id, 'concierge', 'Concierge', 'guest_services', 6, 'Users' FROM tenants t
ON CONFLICT (tenant_id, service_key) DO NOTHING;

INSERT INTO hotel_qr_services_catalog (tenant_id, service_key, service_label, category, display_order, icon)
SELECT t.id, 'front_desk', 'Front Desk', 'guest_services', 7, 'HelpCircle' FROM tenants t
ON CONFLICT (tenant_id, service_key) DO NOTHING;

INSERT INTO hotel_qr_services_catalog (tenant_id, service_key, service_label, category, display_order, icon)
SELECT t.id, 'feedback', 'Share Feedback', 'guest_services', 8, 'MessageSquare' FROM tenants t
ON CONFLICT (tenant_id, service_key) DO NOTHING;

INSERT INTO hotel_qr_services_catalog (tenant_id, service_key, service_label, category, display_order, icon)
SELECT t.id, 'spa', 'Spa Services', 'wellness', 9, 'Sparkle' FROM tenants t
ON CONFLICT (tenant_id, service_key) DO NOTHING;

INSERT INTO hotel_qr_services_catalog (tenant_id, service_key, service_label, category, display_order, icon)
SELECT t.id, 'laundry', 'Laundry', 'housekeeping', 10, 'Shirt' FROM tenants t
ON CONFLICT (tenant_id, service_key) DO NOTHING;

INSERT INTO hotel_qr_services_catalog (tenant_id, service_key, service_label, category, display_order, icon)
SELECT t.id, 'dining', 'Dining Reservations', 'food_beverage', 11, 'CalendarCheck' FROM tenants t
ON CONFLICT (tenant_id, service_key) DO NOTHING;