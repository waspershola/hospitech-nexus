-- Add Room Categories table
CREATE TABLE room_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  short_code text NOT NULL,
  description text,
  base_rate numeric(12,2) DEFAULT 0,
  max_occupancy int DEFAULT 2,
  amenities jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, short_code)
);

-- RLS for room_categories
ALTER TABLE room_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant categories"
  ON room_categories FOR SELECT
  USING (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY "Managers can manage categories"
  ON room_categories FOR ALL
  USING (
    tenant_id = get_user_tenant(auth.uid()) 
    AND (has_role(auth.uid(), tenant_id, 'owner'::app_role) OR has_role(auth.uid(), tenant_id, 'manager'::app_role))
  );

-- Add Payments table
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES bookings(id),
  amount numeric(12,2) NOT NULL,
  currency text DEFAULT 'NGN',
  method text,
  provider_reference text,
  status text DEFAULT 'pending',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- RLS for payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant payments"
  ON payments FOR SELECT
  USING (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY "Staff can manage payments"
  ON payments FOR ALL
  USING (tenant_id = get_user_tenant(auth.uid()));

-- Enhance rooms table
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES room_categories(id);
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS capacity int DEFAULT 1;

-- Enhance bookings table for idempotency
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS action_id text UNIQUE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Add room_status_history for audit trail
CREATE TABLE room_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  changed_by uuid REFERENCES auth.users(id),
  reason text,
  created_at timestamptz DEFAULT now()
);

-- RLS for room_status_history
ALTER TABLE room_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant room history"
  ON room_status_history FOR SELECT
  USING (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY "System can insert room history"
  ON room_status_history FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant(auth.uid()));

-- Trigger for room status changes
CREATE OR REPLACE FUNCTION log_room_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO room_status_history (tenant_id, room_id, old_status, new_status, changed_by)
    VALUES (NEW.tenant_id, NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER room_status_change_trigger
  AFTER UPDATE ON rooms
  FOR EACH ROW
  EXECUTE FUNCTION log_room_status_change();