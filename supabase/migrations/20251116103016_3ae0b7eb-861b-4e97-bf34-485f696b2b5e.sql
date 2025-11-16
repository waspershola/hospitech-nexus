-- Make folio_post_payment idempotent and more robust
CREATE OR REPLACE FUNCTION public.folio_post_payment(
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
  
  -- Create folio transaction with payment_id in metadata
  INSERT INTO folio_transactions (
    tenant_id, folio_id, transaction_type, amount, description,
    reference_type, reference_id, created_by, metadata
  ) VALUES (
    v_folio.tenant_id, p_folio_id, 'payment', p_amount, 'Payment received',
    'payment', p_payment_id, auth.uid(),
    jsonb_build_object('payment_id', p_payment_id)
  ) RETURNING id INTO v_transaction_id;
  
  -- Update folio balances
  UPDATE stay_folios
  SET 
    total_payments = COALESCE(total_payments, 0) + p_amount,
    balance = COALESCE(total_charges, 0) - (COALESCE(total_payments, 0) + p_amount),
    updated_at = now()
  WHERE id = p_folio_id;
  
  -- Update payment to reference folio
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