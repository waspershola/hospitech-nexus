-- Phase 1: Add Pay Later provider to finance_providers
INSERT INTO finance_providers (
  name, 
  type, 
  status, 
  fee_percent, 
  meta,
  tenant_id
)
SELECT 
  'Pay Later',
  'cash',
  'active',
  0,
  '{"internal": true, "supports_partial": true, "deferred": true}'::jsonb,
  id
FROM tenants
ON CONFLICT DO NOTHING;

-- Phase 2: Create booking_charges table for itemized charges and running balance
CREATE TABLE IF NOT EXISTS booking_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  guest_id uuid NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  charge_type text NOT NULL CHECK (charge_type IN ('room', 'service', 'food', 'beverage', 'balance_due', 'other')),
  description text NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0),
  department text,
  provider_id uuid REFERENCES finance_providers(id),
  location_id uuid REFERENCES finance_locations(id),
  charged_at timestamptz DEFAULT now(),
  charged_by uuid,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_booking_charges_booking ON booking_charges(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_charges_guest ON booking_charges(guest_id);
CREATE INDEX IF NOT EXISTS idx_booking_charges_tenant ON booking_charges(tenant_id);
CREATE INDEX IF NOT EXISTS idx_booking_charges_type ON booking_charges(charge_type);

-- Enable RLS
ALTER TABLE booking_charges ENABLE ROW LEVEL SECURITY;

-- RLS Policies for booking_charges
CREATE POLICY charges_tenant_access ON booking_charges
  FOR ALL 
  USING (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY charges_insert ON booking_charges
  FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant(auth.uid()));

-- Add helpful comment
COMMENT ON TABLE booking_charges IS 'Itemized charges per booking for folio management and balance tracking';
COMMENT ON COLUMN booking_charges.charge_type IS 'Type of charge: room, service, food, beverage, balance_due (for underpayments), or other';
COMMENT ON COLUMN booking_charges.amount IS 'Charge amount - always positive';
