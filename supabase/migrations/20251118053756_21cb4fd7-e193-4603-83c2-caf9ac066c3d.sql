-- Fix folio_post_payment to return only primitives, not the entire folio object
CREATE OR REPLACE FUNCTION public.folio_post_payment(
  p_folio_id uuid, 
  p_payment_id uuid, 
  p_amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_folio_record stay_folios;
  v_transaction_id uuid;
  v_new_balance numeric;
  v_new_total_payments numeric;
BEGIN
  -- Idempotency check: If already posted, return success
  IF EXISTS (
    SELECT 1 FROM folio_transactions
    WHERE metadata->>'payment_id' = p_payment_id::text
      AND folio_id = p_folio_id
  ) THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_posted', true,
      'message', 'Payment already posted to this folio'
    );
  END IF;

  -- Lock folio row to prevent race conditions
  SELECT * INTO v_folio_record
  FROM stay_folios
  WHERE id = p_folio_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Folio not found');
  END IF;
  
  IF v_folio_record.status != 'open' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot post to closed folio');
  END IF;
  
  -- Create folio transaction with payment_id in metadata
  INSERT INTO folio_transactions (
    tenant_id, folio_id, transaction_type, amount, description,
    reference_type, reference_id, created_by, metadata
  ) VALUES (
    v_folio_record.tenant_id, p_folio_id, 'payment', p_amount, 'Payment received',
    'payment', p_payment_id, auth.uid(),
    jsonb_build_object('payment_id', p_payment_id)
  ) RETURNING id INTO v_transaction_id;
  
  -- Calculate new values
  v_new_total_payments := COALESCE(v_folio_record.total_payments, 0) + p_amount;
  v_new_balance := COALESCE(v_folio_record.total_charges, 0) - v_new_total_payments;
  
  -- Update folio balances
  UPDATE stay_folios
  SET 
    total_payments = v_new_total_payments,
    balance = v_new_balance,
    updated_at = now()
  WHERE id = p_folio_id;
  
  -- Update payment to reference folio
  UPDATE payments
  SET stay_folio_id = p_folio_id
  WHERE id = p_payment_id;
  
  -- Return ONLY primitive values, NOT the entire folio object
  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'folio_id', p_folio_id,
    'new_balance', v_new_balance,
    'total_payments', v_new_total_payments
  );
END;
$$;

COMMENT ON FUNCTION folio_post_payment IS 'V2.2.1-FINAL-FIX: Returns only primitive values to prevent UUID serialization issues';