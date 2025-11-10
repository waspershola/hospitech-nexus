-- Create restaurant_reservations table for dining reservations
CREATE TABLE IF NOT EXISTS restaurant_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  qr_token VARCHAR,
  guest_name VARCHAR NOT NULL,
  guest_contact VARCHAR,
  guest_email VARCHAR,
  reservation_date DATE NOT NULL,
  reservation_time TIME NOT NULL,
  number_of_guests INTEGER NOT NULL CHECK (number_of_guests > 0),
  special_requests TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show'
  table_number VARCHAR,
  confirmed_by UUID,
  confirmed_at TIMESTAMPTZ,
  seated_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_restaurant_reservations_tenant_id ON restaurant_reservations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_reservations_qr_token ON restaurant_reservations(qr_token);
CREATE INDEX IF NOT EXISTS idx_restaurant_reservations_date ON restaurant_reservations(reservation_date);
CREATE INDEX IF NOT EXISTS idx_restaurant_reservations_status ON restaurant_reservations(status);

-- Enable RLS
ALTER TABLE restaurant_reservations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for restaurant_reservations
CREATE POLICY "Guests can create reservations via QR"
ON restaurant_reservations
FOR INSERT
WITH CHECK (qr_token IS NOT NULL);

CREATE POLICY "Guests can view their own reservations"
ON restaurant_reservations
FOR SELECT
USING (qr_token IS NOT NULL);

CREATE POLICY "Staff can view all reservations in their tenant"
ON restaurant_reservations
FOR SELECT
USING (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY "Staff can manage reservations"
ON restaurant_reservations
FOR ALL
USING (
  tenant_id = get_user_tenant(auth.uid()) AND
  (has_role(auth.uid(), tenant_id, 'owner') OR 
   has_role(auth.uid(), tenant_id, 'manager') OR
   has_role(auth.uid(), tenant_id, 'restaurant') OR
   has_role(auth.uid(), tenant_id, 'frontdesk'))
);

-- Add trigger for updated_at
CREATE TRIGGER update_restaurant_reservations_updated_at
  BEFORE UPDATE ON restaurant_reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE restaurant_reservations IS 'Stores dining reservation requests from QR portal and manual bookings';
COMMENT ON COLUMN restaurant_reservations.status IS 'Reservation status: pending, confirmed, seated, completed, cancelled, no_show';
COMMENT ON COLUMN restaurant_reservations.qr_token IS 'QR code token if reservation made via QR portal (nullable for manual bookings)';