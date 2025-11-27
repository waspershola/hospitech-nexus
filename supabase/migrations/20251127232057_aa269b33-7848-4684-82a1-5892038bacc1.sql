-- Phase 2: Backend Service Layer - insert_ledger_entry RPC function
-- Version: LEDGER-PHASE2-V1

CREATE OR REPLACE FUNCTION public.insert_ledger_entry(
  p_tenant_id UUID,
  p_transaction_type ledger_transaction_type,
  p_amount NUMERIC,
  p_description TEXT,
  p_reference_type TEXT,
  p_reference_id UUID,
  p_payment_method TEXT DEFAULT NULL,
  p_provider_id UUID DEFAULT NULL,
  p_location_id UUID DEFAULT NULL,
  p_department TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_folio_id UUID DEFAULT NULL,
  p_booking_id UUID DEFAULT NULL,
  p_guest_id UUID DEFAULT NULL,
  p_room_id UUID DEFAULT NULL,
  p_organization_id UUID DEFAULT NULL,
  p_staff_id UUID DEFAULT NULL,
  p_shift_id UUID DEFAULT NULL,
  p_batch_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry_id UUID;
  v_transaction_ref TEXT;
BEGIN
  -- Generate unique transaction reference
  v_transaction_ref := 'LDG-' || 
                       TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                       UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8));
  
  -- Insert ledger entry
  INSERT INTO ledger_entries (
    tenant_id,
    transaction_ref,
    transaction_type,
    amount,
    description,
    reference_type,
    reference_id,
    payment_method,
    provider_id,
    location_id,
    department,
    category,
    folio_id,
    booking_id,
    guest_id,
    room_id,
    organization_id,
    staff_id,
    shift_id,
    batch_id,
    status,
    metadata
  ) VALUES (
    p_tenant_id,
    v_transaction_ref,
    p_transaction_type,
    p_amount,
    p_description,
    p_reference_type,
    p_reference_id,
    p_payment_method,
    p_provider_id,
    p_location_id,
    p_department,
    p_category,
    p_folio_id,
    p_booking_id,
    p_guest_id,
    p_room_id,
    p_organization_id,
    p_staff_id,
    p_shift_id,
    p_batch_id,
    'posted',
    p_metadata || jsonb_build_object(
      'ledger_version', 'LEDGER-PHASE2-V1',
      'created_via', 'insert_ledger_entry'
    )
  )
  RETURNING id INTO v_entry_id;
  
  -- Log to audit trail
  INSERT INTO ledger_audit_logs (
    tenant_id,
    ledger_entry_id,
    action_type,
    performed_by,
    changes
  ) VALUES (
    p_tenant_id,
    v_entry_id,
    'entry_created',
    p_staff_id,
    jsonb_build_object(
      'transaction_ref', v_transaction_ref,
      'transaction_type', p_transaction_type,
      'amount', p_amount,
      'reference_type', p_reference_type,
      'reference_id', p_reference_id
    )
  );
  
  RETURN v_entry_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.insert_ledger_entry TO authenticated;