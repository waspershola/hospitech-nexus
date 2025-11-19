-- Migration: Add Night Audit fields to stay_folios table
-- Version: NIGHT-AUDIT-PREP-V1
-- Purpose: Prepare folio system for night audit operations

-- Add night audit columns to stay_folios
ALTER TABLE stay_folios
ADD COLUMN IF NOT EXISTS night_audit_day DATE,
ADD COLUMN IF NOT EXISTS posting_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS is_closed_for_day BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS folio_snapshot JSONB,
ADD COLUMN IF NOT EXISTS night_audit_status TEXT DEFAULT 'active' CHECK (night_audit_status IN ('active', 'pending_audit', 'audited', 'locked'));

-- Create index for night audit queries
CREATE INDEX IF NOT EXISTS idx_stay_folios_night_audit_day ON stay_folios(night_audit_day) WHERE night_audit_day IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stay_folios_posting_date ON stay_folios(posting_date);
CREATE INDEX IF NOT EXISTS idx_stay_folios_audit_status ON stay_folios(night_audit_status) WHERE night_audit_status != 'active';

-- Add comment for documentation
COMMENT ON COLUMN stay_folios.night_audit_day IS 'The business day this folio is assigned to for night audit purposes';
COMMENT ON COLUMN stay_folios.posting_date IS 'The date transactions are posted to this folio';
COMMENT ON COLUMN stay_folios.is_closed_for_day IS 'Whether this folio is closed for the current business day during night audit';
COMMENT ON COLUMN stay_folios.folio_snapshot IS 'JSON snapshot of folio state at time of night audit for historical record';
COMMENT ON COLUMN stay_folios.night_audit_status IS 'Current night audit status: active (normal operations), pending_audit (ready for audit), audited (audit complete), locked (historical/archived)';

-- Function to set folio ready for night audit
CREATE OR REPLACE FUNCTION prepare_folio_for_night_audit(
  p_folio_id UUID,
  p_audit_day DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_folio RECORD;
  v_snapshot JSONB;
BEGIN
  -- Get current folio state
  SELECT * INTO v_folio
  FROM stay_folios
  WHERE id = p_folio_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Folio not found');
  END IF;

  -- Create snapshot
  v_snapshot := jsonb_build_object(
    'folio_id', v_folio.id,
    'folio_number', v_folio.folio_number,
    'booking_id', v_folio.booking_id,
    'guest_id', v_folio.guest_id,
    'total_charges', v_folio.total_charges,
    'total_payments', v_folio.total_payments,
    'balance', v_folio.balance,
    'status', v_folio.status,
    'snapshot_timestamp', NOW(),
    'audit_day', p_audit_day
  );

  -- Update folio with night audit info
  UPDATE stay_folios
  SET 
    night_audit_day = p_audit_day,
    night_audit_status = 'pending_audit',
    folio_snapshot = v_snapshot,
    is_closed_for_day = true
  WHERE id = p_folio_id;

  RETURN jsonb_build_object(
    'success', true,
    'folio_id', p_folio_id,
    'snapshot', v_snapshot
  );
END;
$$;

-- Function to complete night audit for folio
CREATE OR REPLACE FUNCTION complete_night_audit_for_folio(
  p_folio_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Mark folio as audited and reopen for next day
  UPDATE stay_folios
  SET 
    night_audit_status = 'audited',
    is_closed_for_day = false,
    posting_date = posting_date + INTERVAL '1 day'
  WHERE id = p_folio_id
  AND night_audit_status = 'pending_audit';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Folio not ready for audit completion');
  END IF;

  RETURN jsonb_build_object('success', true, 'folio_id', p_folio_id);
END;
$$;