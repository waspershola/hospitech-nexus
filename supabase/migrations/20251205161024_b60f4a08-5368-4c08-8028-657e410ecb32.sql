-- ORG-PAYMENT-FIX-V1: Phase 2 - Fix ledger trigger null reference
-- Phase 3 - Add missing ON CONFLICT constraint for receipt_sequences

-- First, add unique constraint for receipt_sequences if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'uq_receipt_sequences_tenant_type_year'
  ) THEN
    ALTER TABLE receipt_sequences 
    ADD CONSTRAINT uq_receipt_sequences_tenant_type_year 
    UNIQUE (tenant_id, receipt_type, year);
    RAISE NOTICE 'Added unique constraint uq_receipt_sequences_tenant_type_year';
  ELSE
    RAISE NOTICE 'Constraint uq_receipt_sequences_tenant_type_year already exists';
  END IF;
END $$;

-- Fix the record_folio_transaction_to_ledger function with null-safe access
CREATE OR REPLACE FUNCTION public.record_folio_transaction_to_ledger()
RETURNS TRIGGER AS $$
DECLARE
  v_folio RECORD;
  v_payment RECORD;
  v_transaction_type ledger_transaction_type;
  v_payment_method TEXT;
  v_payment_method_id UUID;
  v_payment_provider_id UUID;
  v_payment_location_id UUID;
BEGIN
  -- Get folio details
  SELECT * INTO v_folio
  FROM stay_folios
  WHERE id = NEW.folio_id;
  
  IF NOT FOUND THEN
    RAISE NOTICE '[LEDGER-FOLIO-V3-NULLSAFE] Folio not found: %', NEW.folio_id;
    RETURN NEW;
  END IF;

  v_transaction_type := CASE 
    WHEN NEW.transaction_type = 'charge' THEN 'debit'::ledger_transaction_type
    WHEN NEW.transaction_type = 'payment' THEN 'credit'::ledger_transaction_type
    ELSE 'credit'::ledger_transaction_type
  END;

  -- Initialize payment fields to NULL
  v_payment := NULL;
  v_payment_method := 'folio';
  v_payment_method_id := NULL;
  v_payment_provider_id := NULL;
  v_payment_location_id := NULL;

  -- Get payment dimensions only if this is a payment transaction with valid reference
  IF NEW.transaction_type = 'payment' AND NEW.reference_type = 'payment' AND NEW.reference_id IS NOT NULL THEN
    SELECT 
      p.*,
      pm.id as method_id
    INTO v_payment
    FROM payments p
    LEFT JOIN payment_methods pm ON pm.name = p.method AND pm.tenant_id = p.tenant_id
    WHERE p.id = NEW.reference_id;
    
    -- Only use payment fields if we found the payment
    IF v_payment.id IS NOT NULL THEN
      v_payment_method := COALESCE(v_payment.method, 'folio');
      v_payment_method_id := v_payment.method_id;
      v_payment_provider_id := v_payment.provider_id;
      v_payment_location_id := v_payment.location_id;
    END IF;
  END IF;

  -- Insert ledger entry with null-safe fields
  PERFORM insert_ledger_entry(
    p_tenant_id := NEW.tenant_id,
    p_transaction_type := v_transaction_type,
    p_amount := NEW.amount,
    p_description := NEW.description,
    p_reference_type := NEW.reference_type,
    p_reference_id := NEW.reference_id,
    p_category := CASE 
      WHEN NEW.transaction_type = 'charge' THEN 'folio_charge'
      WHEN NEW.transaction_type = 'payment' THEN 'folio_payment'
      ELSE 'folio_transaction'
    END,
    p_payment_method := v_payment_method,
    p_payment_method_id := v_payment_method_id,
    p_payment_provider_id := v_payment_provider_id,
    p_payment_location_id := v_payment_location_id,
    p_source_type := 'folio',
    p_folio_id := NEW.folio_id,
    p_booking_id := v_folio.booking_id,
    p_guest_id := v_folio.guest_id,
    p_room_id := v_folio.room_id,
    p_department := NEW.department,
    p_staff_id := NEW.created_by,
    p_metadata := jsonb_build_object(
      'folio_transaction_id', NEW.id,
      'folio_number', v_folio.folio_number,
      'transaction_type', NEW.transaction_type,
      'payment_id', CASE WHEN v_payment.id IS NOT NULL THEN v_payment.id ELSE NULL END,
      'version', 'LEDGER-FOLIO-V3-NULLSAFE'
    )
  );

  RAISE NOTICE '[LEDGER-FOLIO-V3-NULLSAFE] Recorded folio transaction % to ledger', NEW.id;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '[LEDGER-FOLIO-V3-NULLSAFE] Failed to record folio transaction to ledger: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;