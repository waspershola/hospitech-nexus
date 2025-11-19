
-- =====================================================
-- PHASE 1: GROUP BOOKING DATABASE FOUNDATION + CONFIG FIX
-- =====================================================

-- ✅ FIX #1: Add missing check_out_time configuration for all tenants
INSERT INTO hotel_configurations (tenant_id, key, value)
SELECT 
  t.id as tenant_id,
  'check_out_time' as key,
  '"12:00 PM"'::jsonb as value
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM hotel_configurations hc 
  WHERE hc.tenant_id = t.id AND hc.key = 'check_out_time'
);

-- ✅ FIX #2: Create group_bookings table
CREATE TABLE IF NOT EXISTS group_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  group_id UUID NOT NULL UNIQUE,
  group_name TEXT NOT NULL,
  group_leader TEXT,
  group_size INTEGER NOT NULL DEFAULT 0,
  master_booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  master_folio_id UUID REFERENCES stay_folios(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active',
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for group_bookings
CREATE INDEX IF NOT EXISTS idx_group_bookings_tenant ON group_bookings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_group_bookings_group_id ON group_bookings(group_id);
CREATE INDEX IF NOT EXISTS idx_group_bookings_master_booking ON group_bookings(master_booking_id);
CREATE INDEX IF NOT EXISTS idx_group_bookings_master_folio ON group_bookings(master_folio_id);

-- RLS for group_bookings
ALTER TABLE group_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view group bookings for their tenant"
  ON group_bookings FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users can create group bookings for their tenant"
  ON group_bookings FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update group bookings for their tenant"
  ON group_bookings FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()));

-- ✅ FIX #3: Create create_group_master_folio RPC
CREATE OR REPLACE FUNCTION create_group_master_folio(
  p_tenant_id UUID,
  p_group_id UUID,
  p_master_booking_id UUID,
  p_guest_id UUID,
  p_group_name TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_group_booking RECORD;
  v_existing_master_folio RECORD;
  v_folio_number TEXT;
  v_new_folio_id UUID;
  v_booking RECORD;
  v_room_id UUID;
BEGIN
  -- Idempotency check: If group already has a master folio, return it
  SELECT * INTO v_existing_group_booking
  FROM group_bookings
  WHERE group_id = p_group_id
    AND tenant_id = p_tenant_id;
  
  IF FOUND AND v_existing_group_booking.master_folio_id IS NOT NULL THEN
    -- Return existing master folio
    SELECT * INTO v_existing_master_folio
    FROM stay_folios
    WHERE id = v_existing_group_booking.master_folio_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'master_folio_id', v_existing_master_folio.id,
      'folio_number', v_existing_master_folio.folio_number,
      'already_existed', true
    );
  END IF;
  
  -- Get booking details
  SELECT * INTO v_booking
  FROM bookings
  WHERE id = p_master_booking_id
    AND tenant_id = p_tenant_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Master booking not found'
    );
  END IF;
  
  v_room_id := v_booking.room_id;
  
  -- Generate folio number with GMF prefix
  SELECT 'GMF-' || 
         TO_CHAR(NOW(), 'YYYY') || '-' || 
         TO_CHAR(NOW(), 'MM') || '-' || 
         LPAD((
           SELECT COALESCE(MAX(
             SUBSTRING(folio_number FROM 'GMF-\d{4}-\d{2}-(\d+)')::INTEGER
           ), 0) + 1
           FROM stay_folios
           WHERE tenant_id = p_tenant_id
             AND folio_number LIKE 'GMF-' || TO_CHAR(NOW(), 'YYYY') || '-' || TO_CHAR(NOW(), 'MM') || '-%'
         )::TEXT, 4, '0')
  INTO v_folio_number;
  
  -- Create master folio
  INSERT INTO stay_folios (
    tenant_id,
    booking_id,
    guest_id,
    room_id,
    folio_number,
    folio_type,
    status,
    total_charges,
    total_payments,
    balance,
    metadata
  ) VALUES (
    p_tenant_id,
    p_master_booking_id,
    p_guest_id,
    v_room_id,
    v_folio_number,
    'group_master',
    'open',
    0,
    0,
    0,
    jsonb_build_object(
      'group_id', p_group_id,
      'group_name', p_group_name,
      'is_group_master', true
    )
  )
  RETURNING id INTO v_new_folio_id;
  
  -- Insert or update group_bookings record
  INSERT INTO group_bookings (
    tenant_id,
    group_id,
    group_name,
    master_booking_id,
    master_folio_id,
    status
  ) VALUES (
    p_tenant_id,
    p_group_id,
    p_group_name,
    p_master_booking_id,
    v_new_folio_id,
    'active'
  )
  ON CONFLICT (group_id) 
  DO UPDATE SET
    master_booking_id = EXCLUDED.master_booking_id,
    master_folio_id = EXCLUDED.master_folio_id,
    status = 'active',
    updated_at = NOW();
  
  -- Log audit event
  INSERT INTO finance_audit_events (
    tenant_id,
    event_type,
    user_id,
    target_id,
    payload
  ) VALUES (
    p_tenant_id,
    'group_master_folio_created',
    auth.uid(),
    v_new_folio_id,
    jsonb_build_object(
      'group_id', p_group_id,
      'group_name', p_group_name,
      'master_booking_id', p_master_booking_id,
      'folio_number', v_folio_number,
      'method', 'create_group_master_folio',
      'version', 'GROUP-MASTER-FOUNDATION-V1'
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'master_folio_id', v_new_folio_id,
    'folio_number', v_folio_number,
    'already_existed', false
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'sqlstate', SQLSTATE
  );
END;
$$;

-- ✅ FIX #4: Fix get_group_master_folio RPC signature to accept group_id
CREATE OR REPLACE FUNCTION get_group_master_folio(
  p_tenant_id UUID,
  p_group_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_booking RECORD;
  v_master_folio RECORD;
  v_child_folios JSONB;
  v_aggregated_balances JSONB;
  v_total_charges NUMERIC := 0;
  v_total_payments NUMERIC := 0;
  v_outstanding_balance NUMERIC := 0;
BEGIN
  -- Get group booking record
  SELECT * INTO v_group_booking
  FROM group_bookings
  WHERE group_id = p_group_id
    AND tenant_id = p_tenant_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Group booking not found',
      'group_id', p_group_id
    );
  END IF;
  
  -- Get master folio
  SELECT * INTO v_master_folio
  FROM stay_folios
  WHERE id = v_group_booking.master_folio_id
    AND tenant_id = p_tenant_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Master folio not found',
      'group_id', p_group_id,
      'expected_master_folio_id', v_group_booking.master_folio_id
    );
  END IF;
  
  -- Get child folios
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', sf.id,
      'folio_number', sf.folio_number,
      'folio_type', sf.folio_type,
      'booking_id', sf.booking_id,
      'guest_id', sf.guest_id,
      'room_id', sf.room_id,
      'total_charges', sf.total_charges,
      'total_payments', sf.total_payments,
      'balance', sf.balance,
      'status', sf.status,
      'created_at', sf.created_at,
      'booking', jsonb_build_object(
        'booking_reference', b.booking_reference,
        'check_in', b.check_in,
        'check_out', b.check_out
      ),
      'guest', jsonb_build_object(
        'name', g.name,
        'email', g.email,
        'phone', g.phone
      ),
      'room', jsonb_build_object(
        'number', r.number
      )
    )
  ) INTO v_child_folios
  FROM stay_folios sf
  LEFT JOIN bookings b ON b.id = sf.booking_id
  LEFT JOIN guests g ON g.id = sf.guest_id
  LEFT JOIN rooms r ON r.id = sf.room_id
  WHERE sf.tenant_id = p_tenant_id
    AND sf.parent_folio_id = v_master_folio.id
    AND sf.folio_type != 'group_master';
  
  -- Calculate aggregated balances
  SELECT 
    COALESCE(SUM(sf.total_charges), 0),
    COALESCE(SUM(sf.total_payments), 0),
    COALESCE(SUM(sf.balance), 0)
  INTO v_total_charges, v_total_payments, v_outstanding_balance
  FROM stay_folios sf
  WHERE sf.tenant_id = p_tenant_id
    AND (sf.id = v_master_folio.id OR sf.parent_folio_id = v_master_folio.id);
  
  -- Build aggregated balances object
  SELECT jsonb_build_object(
    'total_charges', v_total_charges,
    'total_payments', v_total_payments,
    'outstanding_balance', v_outstanding_balance,
    'children_breakdown', COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'folio_id', sf.id,
          'folio_number', sf.folio_number,
          'folio_type', sf.folio_type,
          'room_number', r.number,
          'guest_name', g.name,
          'charges', sf.total_charges,
          'payments', sf.total_payments,
          'balance', sf.balance
        )
      )
      FROM stay_folios sf
      LEFT JOIN rooms r ON r.id = sf.room_id
      LEFT JOIN guests g ON g.id = sf.guest_id
      WHERE sf.tenant_id = p_tenant_id
        AND sf.parent_folio_id = v_master_folio.id),
      '[]'::JSONB
    )
  ) INTO v_aggregated_balances;
  
  -- Return complete group master folio data
  RETURN jsonb_build_object(
    'master_folio', row_to_json(v_master_folio),
    'child_folios', COALESCE(v_child_folios, '[]'::JSONB),
    'aggregated_balances', v_aggregated_balances
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'sqlstate', SQLSTATE
  );
END;
$$;

-- Backfill existing group bookings from bookings.metadata->>'group_id'
INSERT INTO group_bookings (
  tenant_id,
  group_id,
  group_name,
  group_size,
  status
)
SELECT DISTINCT ON (b.metadata->>'group_id')
  b.tenant_id,
  (b.metadata->>'group_id')::UUID as group_id,
  COALESCE(b.metadata->>'group_name', 'Unnamed Group') as group_name,
  (SELECT COUNT(*) FROM bookings WHERE metadata->>'group_id' = b.metadata->>'group_id' AND tenant_id = b.tenant_id) as group_size,
  'active' as status
FROM bookings b
WHERE b.metadata->>'group_id' IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM group_bookings gb 
    WHERE gb.group_id = (b.metadata->>'group_id')::UUID
  )
ON CONFLICT (group_id) DO NOTHING;

COMMENT ON TABLE group_bookings IS 'GROUP-BOOKING-FOUNDATION-V1: Stores group-level booking metadata';
COMMENT ON FUNCTION create_group_master_folio IS 'GROUP-MASTER-RPC-V1: Creates idempotent group master folio';
COMMENT ON FUNCTION get_group_master_folio IS 'GROUP-MASTER-FETCH-V1: Fetches group master folio with children';
