-- Phase 1: Database Schema Enhancement for QR Guest Portal

-- Menu items table for F&B ordering
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL, -- 'breakfast', 'main_course', 'beverages', 'desserts', 'appetizers'
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'NGN',
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  preparation_time VARCHAR(50), -- e.g., "30-45 minutes"
  dietary_tags TEXT[], -- ['vegetarian', 'gluten-free', 'spicy']
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Guest orders table
CREATE TABLE IF NOT EXISTS guest_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  qr_token VARCHAR(255) NOT NULL,
  guest_name VARCHAR(255),
  room_id UUID REFERENCES rooms(id),
  items JSONB NOT NULL, -- [{item_id, name, quantity, price, notes}]
  special_instructions TEXT,
  subtotal DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'preparing', 'ready', 'delivered', 'cancelled'
  request_id UUID REFERENCES requests(id), -- Link to request for tracking
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- WiFi credentials (tenant-scoped)
CREATE TABLE IF NOT EXISTS wifi_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  location VARCHAR(255), -- 'Poolside Bar', 'Main Lobby', 'All Areas'
  network_name VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  instructions TEXT,
  qr_data TEXT, -- Pre-generated WiFi QR code data
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Guest feedback/ratings
CREATE TABLE IF NOT EXISTS guest_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  qr_token VARCHAR(255) NOT NULL,
  request_id UUID REFERENCES requests(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  category VARCHAR(50), -- 'service', 'cleanliness', 'food', 'overall', 'staff'
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE wifi_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for menu_items
CREATE POLICY "Menu items viewable by tenant users and guests"
  ON menu_items FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Menu items manageable by owners and managers"
  ON menu_items FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'manager', 'restaurant', 'kitchen')
    )
  );

-- RLS Policies for guest_orders
CREATE POLICY "Orders viewable by tenant staff"
  ON guest_orders FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Orders insertable by anyone with QR token"
  ON guest_orders FOR INSERT
  WITH CHECK (true); -- Public insert for QR portal

CREATE POLICY "Orders updatable by tenant staff"
  ON guest_orders FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for wifi_credentials
CREATE POLICY "WiFi credentials viewable by tenant"
  ON wifi_credentials FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "WiFi credentials manageable by owners and managers"
  ON wifi_credentials FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'manager')
    )
  );

-- RLS Policies for guest_feedback
CREATE POLICY "Feedback viewable by tenant staff"
  ON guest_feedback FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Feedback insertable by anyone with QR token"
  ON guest_feedback FOR INSERT
  WITH CHECK (true); -- Public insert for QR portal

-- Updated at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guest_orders_updated_at
  BEFORE UPDATE ON guest_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();