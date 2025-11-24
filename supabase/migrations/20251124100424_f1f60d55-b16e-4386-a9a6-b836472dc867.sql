-- Migration: Harden UUID Parsing with JSON-First Strategy
-- Version: DEFENSIVE-UUID-V2
-- Description: Prioritize JSON object parsing before direct UUID cast to prevent 
--              PostgreSQL errors when Supabase JS client serializes folio objects

-- ============================================
-- Drop existing function and recreate with JSON-first logic
-- ============================================

DROP FUNCTION IF EXISTS folio_post_charge(text, numeric, text, text, uuid, text);

CREATE OR REPLACE FUNCTION folio_post_charge(
  p_folio_id TEXT,
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
  v_folio_id uuid;
  v_folio stay_folios;
  v_transaction_id uuid;
  v_booking bookings;
  v_org_validation jsonb;
BEGIN
  -- Try JSON parsing FIRST to handle serialized objects from Supabase JS client
  BEGIN
    v_folio_id := (p_folio_id::jsonb->>'id')::uuid;
    RAISE NOTICE '[folio_post_charge] DEFENSIVE-UUID-V2: JSON->id succeeded - %', v_folio_id;
  EXCEPTION WHEN OTHERS THEN
    -- Fallback: treat p_folio_id as plain UUID string
    BEGIN
      v_folio_id := p_folio_id::uuid;
      RAISE NOTICE '[folio_post_charge] DEFENSIVE-UUID-V2: Direct UUID cast fallback - %', v_folio_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '[folio_post_charge] DEFENSIVE-UUID-V2: All parsing failed - input: %', p_folio_id;
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Invalid folio_id format',
        'hint', 'Expected UUID string or JSON object with id property',
        'code', 'INVALID_FOLIO_ID_FORMAT',
        'debug_input', p_folio_id,
        'version', 'DEFENSIVE-UUID-V2'
      );
    END;
  END;

  SELECT * INTO v_folio FROM stay_folios WHERE id = v_folio_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Folio not found', 'code', 'FOLIO_NOT_FOUND', 'version', 'DEFENSIVE-UUID-V2');
  END IF;
  IF v_folio.status != 'open' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot post to closed folio', 'code', 'FOLIO_CLOSED', 'version', 'DEFENSIVE-UUID-V2');
  END IF;

  SELECT * INTO v_booking FROM bookings WHERE id = v_folio.booking_id AND tenant_id = v_folio.tenant_id;
  IF FOUND AND v_booking.organization_id IS NOT NULL THEN
    SELECT validate_org_limits(v_booking.organization_id, v_folio.guest_id, COALESCE(p_department, 'general'), p_amount) INTO v_org_validation;
    IF (v_org_validation->>'allowed')::boolean = false THEN
      RETURN jsonb_build_object('success', false, 'error', 'Organization credit limit exceeded', 'code', v_org_validation->>'code', 'detail', v_org_validation->>'detail', 'version', 'DEFENSIVE-UUID-V2');
    END IF;
  END IF;

  INSERT INTO folio_transactions (tenant_id, folio_id, transaction_type, amount, description, reference_type, reference_id, department, created_by)
  VALUES (v_folio.tenant_id, v_folio_id, 'charge', p_amount, p_description, p_reference_type, p_reference_id, p_department, auth.uid())
  RETURNING id INTO v_transaction_id;

  UPDATE stay_folios SET total_charges = total_charges + p_amount, balance = balance + p_amount, updated_at = now() WHERE id = v_folio_id;
  SELECT row_to_json(f.*)::jsonb INTO v_folio FROM stay_folios f WHERE id = v_folio_id;

  RETURN jsonb_build_object(
    'success', true, 
    'transaction_id', v_transaction_id, 
    'folio', v_folio, 
    'version', 'DEFENSIVE-UUID-V2',
    'debug_v_folio_id', v_folio_id::text
  );
END;
$$;

GRANT EXECUTE ON FUNCTION folio_post_charge TO authenticated;

-- ============================================
-- SQL Test Queries (run manually in SQL editor to verify)
-- ============================================

-- Test Case A: Plain UUID string (should work)
-- SELECT folio_post_charge(
--   p_folio_id := '05c3ca72-d9ac-49a5-8d32-5b295bc4eb67',
--   p_amount := 1000,
--   p_description := 'Test Charge (UUID)',
--   p_reference_type := null,
--   p_reference_id := null,
--   p_department := 'room'
-- );

-- Test Case B: JSON object string (simulating problematic payload)
-- SELECT folio_post_charge(
--   p_folio_id := '{"id": "05c3ca72-d9ac-49a5-8d32-5b295bc4eb67", "status": "open"}',
--   p_amount := 1000,
--   p_description := 'Test Charge (JSON)',
--   p_reference_type := null,
--   p_reference_id := null,
--   p_department := 'room'
-- );