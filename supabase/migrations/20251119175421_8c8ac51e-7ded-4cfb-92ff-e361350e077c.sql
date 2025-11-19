-- Phase 1: Group Bookings & Master Folio Foundation
-- Version: GROUP-MASTER-FOUNDATION-V1
-- Creates group_bookings table, RPCs for master folio management, and backfills existing groups

-- =====================================================
-- PART 1: Create group_bookings Table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.group_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  group_id UUID NOT NULL UNIQUE,
  group_name TEXT NOT NULL,
  group_leader TEXT,
  group_size INTEGER NOT NULL DEFAULT 1,
  master_booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  master_folio_id UUID REFERENCES public.stay_folios(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_group_bookings_tenant_id ON public.group_bookings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_group_bookings_group_id ON public.group_bookings(group_id);
CREATE INDEX IF NOT EXISTS idx_group_bookings_master_booking ON public.group_bookings(master_booking_id);
CREATE INDEX IF NOT EXISTS idx_group_bookings_master_folio ON public.group_bookings(master_folio_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_group_bookings_tenant_group ON public.group_bookings(tenant_id, group_id);

-- Add updated_at trigger
CREATE TRIGGER update_group_bookings_updated_at
  BEFORE UPDATE ON public.group_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_tenants_updated_at();

-- Add helpful comments
COMMENT ON TABLE public.group_bookings IS 'Central registry for group bookings with master folio linkage';
COMMENT ON COLUMN public.group_bookings.master_booking_id IS 'The booking that owns the group master folio';
COMMENT ON COLUMN public.group_bookings.master_folio_id IS 'The group_master folio that aggregates all child folios';

-- =====================================================
-- PART 2: RLS Policies for group_bookings
-- =====================================================

ALTER TABLE public.group_bookings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view group_bookings in their tenant
CREATE POLICY group_bookings_tenant_select
  ON public.group_bookings
  FOR SELECT
  USING (tenant_id = current_user_tenant());

-- Policy: Users can insert group_bookings in their tenant
CREATE POLICY group_bookings_tenant_insert
  ON public.group_bookings
  FOR INSERT
  WITH CHECK (tenant_id = current_user_tenant());

-- Policy: Users can update group_bookings in their tenant
CREATE POLICY group_bookings_tenant_update
  ON public.group_bookings
  FOR UPDATE
  USING (tenant_id = current_user_tenant())
  WITH CHECK (tenant_id = current_user_tenant());

-- Policy: Users can delete group_bookings in their tenant
CREATE POLICY group_bookings_tenant_delete
  ON public.group_bookings
  FOR DELETE
  USING (tenant_id = current_user_tenant());

-- =====================================================
-- PART 3: Create create_group_master_folio RPC
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_group_master_folio(
  p_tenant_id UUID,
  p_group_id UUID,
  p_master_booking_id UUID,
  p_guest_id UUID,
  p_group_name TEXT
)
RETURNS JSONB
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

COMMENT ON FUNCTION public.create_group_master_folio IS 'Creates or returns existing group master folio with idempotency guarantee';

-- =====================================================
-- PART 4: Fix get_group_master_folio RPC Signature
-- =====================================================

-- Drop old function with wrong signature
DROP FUNCTION IF EXISTS public.get_group_master_folio(UUID, UUID);

-- Create new function with correct signature
CREATE OR REPLACE FUNCTION public.get_group_master_folio(
  p_tenant_id UUID,
  p_group_id UUID
)
RETURNS JSONB
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
  
  -- Get child folios (all folios linked to bookings in this group)
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

COMMENT ON FUNCTION public.get_group_master_folio IS 'Fetches group master folio with all child folios and aggregated balances by group_id';

-- =====================================================
-- PART 5: Backfill Existing Groups
-- =====================================================

-- Idempotent backfill: Create group_bookings and master folios for existing groups
DO $$
DECLARE
  v_group RECORD;
  v_first_booking RECORD;
  v_result JSONB;
  v_groups_processed INTEGER := 0;
  v_folios_created INTEGER := 0;
BEGIN
  RAISE NOTICE '[BACKFILL-V1] Starting group bookings backfill...';
  
  -- Find all distinct group_ids from bookings metadata
  FOR v_group IN
    SELECT DISTINCT
      b.tenant_id,
      b.metadata->>'group_id' AS group_id,
      COUNT(*) AS booking_count
    FROM bookings b
    WHERE b.metadata ? 'group_id'
      AND b.metadata->>'group_id' IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM group_bookings gb
        WHERE gb.group_id = (b.metadata->>'group_id')::UUID
      )
    GROUP BY b.tenant_id, b.metadata->>'group_id'
  LOOP
    -- Get the first (earliest) booking in this group as the master
    SELECT b.* INTO v_first_booking
    FROM bookings b
    WHERE b.tenant_id = v_group.tenant_id
      AND b.metadata->>'group_id' = v_group.group_id
    ORDER BY b.created_at ASC
    LIMIT 1;
    
    IF FOUND THEN
      -- Create master folio for this group
      SELECT create_group_master_folio(
        v_first_booking.tenant_id,
        v_group.group_id::UUID,
        v_first_booking.id,
        v_first_booking.guest_id,
        COALESCE(v_first_booking.metadata->>'group_name', 'Group ' || LEFT(v_group.group_id, 8))
      ) INTO v_result;
      
      IF (v_result->>'success')::BOOLEAN = true THEN
        v_groups_processed := v_groups_processed + 1;
        
        IF (v_result->>'already_existed')::BOOLEAN = false THEN
          v_folios_created := v_folios_created + 1;
        END IF;
        
        RAISE NOTICE '[BACKFILL-V1] Group % processed: master_folio=%', 
          v_group.group_id, 
          v_result->>'master_folio_id';
        
        -- Link existing room folios to this master via parent_folio_id
        UPDATE stay_folios
        SET parent_folio_id = (v_result->>'master_folio_id')::UUID,
            updated_at = NOW()
        WHERE tenant_id = v_first_booking.tenant_id
          AND booking_id IN (
            SELECT id FROM bookings 
            WHERE tenant_id = v_first_booking.tenant_id
              AND metadata->>'group_id' = v_group.group_id
          )
          AND folio_type = 'room'
          AND parent_folio_id IS NULL;
      ELSE
        RAISE WARNING '[BACKFILL-V1] Failed to create master folio for group %: %', 
          v_group.group_id, 
          v_result->>'error';
      END IF;
    END IF;
  END LOOP;
  
  RAISE NOTICE '[BACKFILL-V1] Backfill complete: % groups processed, % new master folios created', 
    v_groups_processed, 
    v_folios_created;
END;
$$;