-- ============================================
-- STAY FOLIOS: Unified billing account per stay
-- ============================================

CREATE TABLE IF NOT EXISTS stay_folios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  room_id uuid REFERENCES rooms(id),
  guest_id uuid REFERENCES guests(id),
  group_id uuid NULL,
  
  -- Folio status
  status text NOT NULL CHECK (status IN ('open','closed','cancelled')) DEFAULT 'open',
  
  -- Financial totals
  balance numeric(12,2) DEFAULT 0,
  total_charges numeric(12,2) DEFAULT 0,
  total_payments numeric(12,2) DEFAULT 0,
  
  -- Metadata
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  closed_at timestamptz NULL,
  
  -- Audit fields
  created_by uuid,
  closed_by uuid
);

-- Indexes
CREATE INDEX idx_stay_folios_tenant_booking ON stay_folios (tenant_id, booking_id);
CREATE INDEX idx_stay_folios_tenant_room_open ON stay_folios (tenant_id, room_id) WHERE status='open';
CREATE INDEX idx_stay_folios_status ON stay_folios (status);

-- RLS Policies
ALTER TABLE stay_folios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stay_folios_tenant_access" ON stay_folios
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()));

-- ============================================
-- UPDATE EXISTING TABLES
-- ============================================

ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS stay_folio_id uuid REFERENCES stay_folios(id);

ALTER TABLE guest_orders
  ADD COLUMN IF NOT EXISTS stay_folio_id uuid REFERENCES stay_folios(id);

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS stay_folio_id uuid REFERENCES stay_folios(id);

ALTER TABLE booking_charges
  ADD COLUMN IF NOT EXISTS stay_folio_id uuid REFERENCES stay_folios(id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_requests_folio ON requests (stay_folio_id);
CREATE INDEX IF NOT EXISTS idx_guest_orders_folio ON guest_orders (stay_folio_id);
CREATE INDEX IF NOT EXISTS idx_payments_folio ON payments (stay_folio_id);

-- ============================================
-- FOLIO LEDGER
-- ============================================

CREATE TABLE IF NOT EXISTS folio_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  folio_id uuid NOT NULL REFERENCES stay_folios(id) ON DELETE CASCADE,
  
  transaction_type text NOT NULL CHECK (transaction_type IN ('charge','payment','adjustment','refund')),
  amount numeric(12,2) NOT NULL,
  
  reference_type text,
  reference_id uuid,
  
  description text NOT NULL,
  department text,
  
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  created_by uuid
);

CREATE INDEX idx_folio_transactions_folio ON folio_transactions (folio_id);
CREATE INDEX idx_folio_transactions_tenant ON folio_transactions (tenant_id);

ALTER TABLE folio_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "folio_transactions_tenant_access" ON folio_transactions
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()));

-- ============================================
-- RPC: Post Charge to Folio
-- ============================================

CREATE OR REPLACE FUNCTION folio_post_charge(
  p_folio_id uuid,
  p_amount numeric,
  p_description text,
  p_reference_type text DEFAULT NULL,
  p_reference_id uuid DEFAULT NULL,
  p_department text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_folio stay_folios;
  v_transaction_id uuid;
BEGIN
  SELECT * INTO v_folio
  FROM stay_folios
  WHERE id = p_folio_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Folio not found');
  END IF;
  
  IF v_folio.status != 'open' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot post to closed folio');
  END IF;
  
  INSERT INTO folio_transactions (
    tenant_id, folio_id, transaction_type, amount, description,
    reference_type, reference_id, department, created_by
  ) VALUES (
    v_folio.tenant_id, p_folio_id, 'charge', p_amount, p_description,
    p_reference_type, p_reference_id, p_department, auth.uid()
  ) RETURNING id INTO v_transaction_id;
  
  UPDATE stay_folios
  SET 
    total_charges = total_charges + p_amount,
    balance = balance + p_amount,
    updated_at = now()
  WHERE id = p_folio_id;
  
  SELECT row_to_json(f.*)::jsonb INTO v_folio
  FROM stay_folios f
  WHERE id = p_folio_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'folio', v_folio
  );
END;
$$;

-- ============================================
-- RPC: Post Payment to Folio
-- ============================================

CREATE OR REPLACE FUNCTION folio_post_payment(
  p_folio_id uuid,
  p_payment_id uuid,
  p_amount numeric
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_folio stay_folios;
  v_transaction_id uuid;
BEGIN
  SELECT * INTO v_folio
  FROM stay_folios
  WHERE id = p_folio_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Folio not found');
  END IF;
  
  INSERT INTO folio_transactions (
    tenant_id, folio_id, transaction_type, amount, description,
    reference_type, reference_id, created_by
  ) VALUES (
    v_folio.tenant_id, p_folio_id, 'payment', p_amount, 'Payment received',
    'payment', p_payment_id, auth.uid()
  ) RETURNING id INTO v_transaction_id;
  
  UPDATE stay_folios
  SET 
    total_payments = total_payments + p_amount,
    balance = balance - p_amount,
    updated_at = now()
  WHERE id = p_folio_id;
  
  UPDATE payments
  SET stay_folio_id = p_folio_id
  WHERE id = p_payment_id;
  
  SELECT row_to_json(f.*)::jsonb INTO v_folio
  FROM stay_folios f
  WHERE id = p_folio_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'folio', v_folio
  );
END;
$$;

-- ============================================
-- RPC: Find Open Folio by Room
-- ============================================

CREATE OR REPLACE FUNCTION find_open_folio_by_room(
  p_tenant_id uuid,
  p_room_id uuid
) RETURNS TABLE(
  folio_id uuid,
  booking_id uuid,
  guest_id uuid,
  balance numeric,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, booking_id, guest_id, balance, created_at
  FROM stay_folios
  WHERE tenant_id = p_tenant_id
    AND room_id = p_room_id
    AND status = 'open'
  ORDER BY created_at DESC
  LIMIT 1;
$$;

-- ============================================
-- RPC: Find Open Folio by Guest Phone
-- ============================================

CREATE OR REPLACE FUNCTION find_open_folio_by_guest_phone(
  p_tenant_id uuid,
  p_phone text
) RETURNS TABLE(
  folio_id uuid,
  booking_id uuid,
  guest_id uuid,
  room_id uuid,
  balance numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sf.id, sf.booking_id, sf.guest_id, sf.room_id, sf.balance
  FROM stay_folios sf
  JOIN guests g ON g.id = sf.guest_id
  WHERE sf.tenant_id = p_tenant_id
    AND g.phone = p_phone
    AND sf.status = 'open'
  ORDER BY sf.created_at DESC
  LIMIT 1;
$$;

-- ============================================
-- TRIGGER: Auto-update folio timestamp
-- ============================================

CREATE OR REPLACE FUNCTION update_folio_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_folio_updated_at
BEFORE UPDATE ON stay_folios
FOR EACH ROW
EXECUTE FUNCTION update_folio_timestamp();