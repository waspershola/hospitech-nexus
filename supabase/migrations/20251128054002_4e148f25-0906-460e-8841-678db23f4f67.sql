-- Create trigger to auto-record folio charges to ledger
-- Version: LEDGER-FOLIO-INTEGRATION-V1

CREATE OR REPLACE FUNCTION public.record_folio_transaction_to_ledger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_folio RECORD;
  v_guest_name TEXT;
  v_room_number TEXT;
  v_booking_id UUID;
BEGIN
  -- Get folio details
  SELECT sf.*, b.id as booking_id, b.guest_id, r.number as room_number, g.name as guest_name
  INTO v_folio
  FROM stay_folios sf
  LEFT JOIN bookings b ON b.id = sf.booking_id
  LEFT JOIN rooms r ON r.id = sf.room_id
  LEFT JOIN guests g ON g.id = sf.guest_id
  WHERE sf.id = NEW.folio_id;
  
  IF NOT FOUND THEN
    RAISE NOTICE '[LEDGER-FOLIO-V1] Folio not found: %', NEW.folio_id;
    RETURN NEW;
  END IF;

  -- Record to ledger (charges are debits, payments are credits)
  PERFORM insert_ledger_entry(
    p_tenant_id := NEW.tenant_id,
    p_transaction_type := CASE 
      WHEN NEW.transaction_type = 'payment' THEN 'credit'::ledger_transaction_type
      WHEN NEW.transaction_type = 'charge' THEN 'debit'::ledger_transaction_type
      WHEN NEW.transaction_type = 'refund' THEN 'refund'::ledger_transaction_type
      WHEN NEW.transaction_type = 'adjustment' THEN 'reversal'::ledger_transaction_type
      ELSE 'debit'::ledger_transaction_type
    END,
    p_amount := ABS(NEW.amount),
    p_description := NEW.description,
    p_reference_type := 'folio_transaction',
    p_reference_id := NEW.id,
    p_category := NEW.transaction_type,
    p_folio_id := NEW.folio_id,
    p_booking_id := v_folio.booking_id,
    p_guest_id := v_folio.guest_id,
    p_department := NEW.department,
    p_staff_id := NEW.created_by,
    p_metadata := jsonb_build_object(
      'folio_number', v_folio.folio_number,
      'folio_type', v_folio.folio_type,
      'guest_name', v_folio.guest_name,
      'room_number', v_folio.room_number,
      'reference_type', NEW.reference_type,
      'reference_id', NEW.reference_id,
      'transaction_metadata', NEW.metadata,
      'version', 'LEDGER-FOLIO-V1'
    )
  );

  RAISE NOTICE '[LEDGER-FOLIO-V1] Recorded folio transaction % to ledger', NEW.id;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '[LEDGER-FOLIO-V1] Failed to record folio transaction to ledger: %', SQLERRM;
    -- Don't block folio transaction if ledger fails
    RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS record_folio_transaction_to_ledger_trigger ON folio_transactions;
CREATE TRIGGER record_folio_transaction_to_ledger_trigger
  AFTER INSERT ON folio_transactions
  FOR EACH ROW
  EXECUTE FUNCTION record_folio_transaction_to_ledger();