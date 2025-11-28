-- Create trigger to auto-record wallet transactions to ledger
-- Version: LEDGER-WALLET-INTEGRATION-V1

CREATE OR REPLACE FUNCTION public.record_wallet_transaction_to_ledger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_wallet RECORD;
  v_payment RECORD;
  v_guest_name TEXT;
  v_room_number TEXT;
  v_booking_id UUID;
BEGIN
  -- Get wallet details
  SELECT * INTO v_wallet
  FROM wallets
  WHERE id = NEW.wallet_id;
  
  IF NOT FOUND THEN
    RAISE NOTICE '[LEDGER-WALLET-V1] Wallet not found: %', NEW.wallet_id;
    RETURN NEW;
  END IF;

  -- Get guest name if wallet is guest type
  IF v_wallet.wallet_type = 'guest' THEN
    SELECT name INTO v_guest_name
    FROM guests
    WHERE id = v_wallet.owner_id;
  ELSIF v_wallet.wallet_type = 'organization' THEN
    SELECT name INTO v_guest_name
    FROM organizations
    WHERE id = v_wallet.owner_id;
  END IF;

  -- Get booking/room context if payment_id is linked
  IF NEW.payment_id IS NOT NULL THEN
    SELECT p.*, b.id as booking_id, r.number as room_number
    INTO v_payment
    FROM payments p
    LEFT JOIN bookings b ON b.id = p.booking_id
    LEFT JOIN rooms r ON r.id = b.room_id
    WHERE p.id = NEW.payment_id;
    
    v_booking_id := v_payment.booking_id;
    v_room_number := v_payment.room_number;
  END IF;

  -- Record to ledger
  PERFORM insert_ledger_entry(
    p_tenant_id := NEW.tenant_id,
    p_transaction_type := CASE 
      WHEN NEW.type = 'credit' THEN 'credit'::ledger_transaction_type
      WHEN NEW.type = 'debit' THEN 'debit'::ledger_transaction_type
      ELSE 'credit'::ledger_transaction_type
    END,
    p_amount := NEW.amount,
    p_description := COALESCE(NEW.description, 'Wallet transaction'),
    p_reference_type := 'wallet_transaction',
    p_reference_id := NEW.id,
    p_payment_method := CASE 
      WHEN NEW.type = 'credit' THEN 'wallet_topup'
      WHEN NEW.type = 'debit' THEN 'wallet_deduction'
      ELSE 'wallet'
    END,
    p_category := CASE 
      WHEN NEW.type = 'credit' THEN 'wallet_topup'
      WHEN NEW.type = 'debit' THEN 'wallet_deduction'
      ELSE 'wallet_transaction'
    END,
    p_booking_id := v_booking_id,
    p_guest_id := CASE WHEN v_wallet.wallet_type = 'guest' THEN v_wallet.owner_id ELSE NULL END,
    p_organization_id := CASE WHEN v_wallet.wallet_type = 'organization' THEN v_wallet.owner_id ELSE NULL END,
    p_staff_id := NEW.created_by,
    p_metadata := jsonb_build_object(
      'wallet_id', NEW.wallet_id,
      'wallet_type', v_wallet.wallet_type,
      'payment_id', NEW.payment_id,
      'guest_name', v_guest_name,
      'room_number', v_room_number,
      'transaction_type', NEW.type,
      'version', 'LEDGER-WALLET-V1'
    )
  );

  RAISE NOTICE '[LEDGER-WALLET-V1] Recorded wallet transaction % to ledger', NEW.id;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '[LEDGER-WALLET-V1] Failed to record wallet transaction to ledger: %', SQLERRM;
    -- Don't block wallet transaction if ledger fails
    RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS record_wallet_transaction_to_ledger_trigger ON wallet_transactions;
CREATE TRIGGER record_wallet_transaction_to_ledger_trigger
  AFTER INSERT ON wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION record_wallet_transaction_to_ledger();