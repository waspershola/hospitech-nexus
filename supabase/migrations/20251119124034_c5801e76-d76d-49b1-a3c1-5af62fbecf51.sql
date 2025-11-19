-- Migration: Enhanced attach_booking_payments_to_folio Function
-- Version: ATTACH-PAYMENTS-V1.3

CREATE OR REPLACE FUNCTION attach_booking_payments_to_folio(
  p_tenant_id UUID,
  p_booking_id UUID,
  p_folio_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment RECORD;
  v_result JSONB;
  v_success_count INTEGER := 0;
  v_fail_count INTEGER := 0;
  v_already_posted_count INTEGER := 0;
BEGIN
  RAISE NOTICE '[ATTACH-PAYMENTS-V1.3] Starting for booking % folio %', p_booking_id, p_folio_id;
  
  IF p_tenant_id IS NULL OR p_booking_id IS NULL OR p_folio_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Missing required parameters',
      'payments_posted', 0,
      'payments_failed', 0,
      'already_posted', 0
    );
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM stay_folios 
    WHERE id = p_folio_id 
    AND booking_id = p_booking_id 
    AND tenant_id = p_tenant_id
    AND status = 'open'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Folio not found or not open',
      'folio_id', p_folio_id,
      'payments_posted', 0,
      'payments_failed', 0,
      'already_posted', 0
    );
  END IF;
  
  FOR v_payment IN
    SELECT id AS payment_id, amount, transaction_ref, status, stay_folio_id
    FROM payments
    WHERE booking_id = p_booking_id
      AND tenant_id = p_tenant_id
      AND status IN ('success', 'completed')
    ORDER BY created_at
  LOOP
    BEGIN
      IF v_payment.stay_folio_id IS NOT NULL THEN
        v_already_posted_count := v_already_posted_count + 1;
        RAISE NOTICE '[ATTACH-PAYMENTS-V1.3] Payment % already posted to folio %', v_payment.payment_id, v_payment.stay_folio_id;
        CONTINUE;
      END IF;
      
      SELECT execute_payment_posting(p_tenant_id, p_booking_id, v_payment.payment_id, v_payment.amount) INTO v_result;
      
      IF (v_result->>'success')::BOOLEAN IS TRUE THEN
        v_success_count := v_success_count + 1;
        RAISE NOTICE '[ATTACH-PAYMENTS-V1.3] Posted payment % (₦%, status=%) to folio', v_payment.payment_id, v_payment.amount, v_payment.status;
        
        INSERT INTO finance_audit_events (
          tenant_id, event_type, user_id, target_id, payload
        ) VALUES (
          p_tenant_id,
          'payment_auto_attached_to_folio',
          NULL,
          v_payment.payment_id,
          jsonb_build_object(
            'booking_id', p_booking_id,
            'folio_id', p_folio_id,
            'amount', v_payment.amount,
            'transaction_ref', v_payment.transaction_ref,
            'payment_status', v_payment.status,
            'method', 'attach_booking_payments_to_folio',
            'version', 'V1.3'
          )
        );
      ELSE
        v_fail_count := v_fail_count + 1;
        RAISE WARNING '[ATTACH-PAYMENTS-V1.3] Failed to post payment %: %', v_payment.payment_id, v_result->>'message';
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_fail_count := v_fail_count + 1;
      RAISE WARNING '[ATTACH-PAYMENTS-V1.3] Exception for payment %: %', v_payment.payment_id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '[ATTACH-PAYMENTS-V1.3] Complete - Posted: %, Failed: %, Already Posted: %', v_success_count, v_fail_count, v_already_posted_count;
  
  RETURN jsonb_build_object(
    'success', true,
    'payments_posted', v_success_count,
    'payments_failed', v_fail_count,
    'already_posted', v_already_posted_count,
    'version', 'V1.3'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION attach_booking_payments_to_folio(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION attach_booking_payments_to_folio(UUID, UUID, UUID) TO service_role;