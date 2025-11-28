-- LEDGER-PHASE-2C-V2: Update record_folio_transaction_to_ledger trigger to pass dimension IDs
-- This trigger fires when folio_transactions are created and records them to ledger_entries

CREATE OR REPLACE FUNCTION public.record_folio_transaction_to_ledger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_folio RECORD;
  v_payment RECORD;
  v_transaction_type ledger_transaction_type;
BEGIN
  -- Get folio details
  SELECT * INTO v_folio
  FROM stay_folios
  WHERE id = NEW.folio_id;
  
  IF NOT FOUND THEN
    RAISE NOTICE '[LEDGER-FOLIO-V2] Folio not found: %', NEW.folio_id;
    RETURN NEW;
  END IF;

  -- Determine transaction type for ledger
  v_transaction_type := CASE 
    WHEN NEW.transaction_type = 'charge' THEN 'debit'::ledger_transaction_type
    WHEN NEW.transaction_type = 'payment' THEN 'credit'::ledger_transaction_type
    ELSE 'credit'::ledger_transaction_type
  END;

  -- Get payment dimensions if this is a payment transaction
  IF NEW.transaction_type = 'payment' AND NEW.reference_type = 'payment' THEN
    SELECT 
      p.*,
      pm.id as method_id
    INTO v_payment
    FROM payments p
    LEFT JOIN payment_methods pm ON pm.name = p.method AND pm.tenant_id = p.tenant_id
    WHERE p.id = NEW.reference_id;
  END IF;

  -- Record to ledger with dimension IDs
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
    p_payment_method := CASE 
      WHEN v_payment.id IS NOT NULL THEN v_payment.method
      ELSE 'folio'
    END,
    p_payment_method_id := v_payment.method_id,
    p_payment_provider_id := v_payment.provider_id,
    p_payment_location_id := v_payment.location_id,
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
      'payment_id', v_payment.id,
      'version', 'LEDGER-FOLIO-V2'
    )
  );

  RAISE NOTICE '[LEDGER-FOLIO-V2] Recorded folio transaction % to ledger', NEW.id;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '[LEDGER-FOLIO-V2] Failed to record folio transaction to ledger: %', SQLERRM;
    -- Don't block folio transaction if ledger fails
    RETURN NEW;
END;
$function$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS record_folio_transaction_to_ledger_trigger ON folio_transactions;
CREATE TRIGGER record_folio_transaction_to_ledger_trigger
  AFTER INSERT ON folio_transactions
  FOR EACH ROW
  EXECUTE FUNCTION record_folio_transaction_to_ledger();