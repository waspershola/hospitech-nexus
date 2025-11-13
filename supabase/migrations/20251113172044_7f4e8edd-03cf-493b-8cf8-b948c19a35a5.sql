-- Create trigger function to auto-waive platform fees on booking cancellation
CREATE OR REPLACE FUNCTION handle_platform_fee_on_booking_cancel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only proceed if status changed TO cancelled
  IF NEW.status = 'cancelled' AND (OLD.status IS NULL OR OLD.status != 'cancelled') THEN
    -- Update platform fee ledger entries for this booking
    UPDATE platform_fee_ledger
    SET 
      status = 'waived',
      waived_at = now(),
      waived_reason = 'Booking canceled - auto-waived by system',
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
        'auto_waived', true,
        'waived_at', now(),
        'cancel_reason', 'Booking canceled',
        'original_status', status,
        'booking_reference', NEW.booking_reference
      )
    WHERE reference_type = 'booking'
      AND reference_id = NEW.id
      AND tenant_id = NEW.tenant_id
      AND status IN ('pending', 'billed')  -- Only waive unpaid/unbilled fees
      AND waived_at IS NULL;  -- Don't re-waive already waived fees
    
    -- Log the action for audit trail
    INSERT INTO finance_audit_events (
      tenant_id,
      event_type,
      user_id,
      target_id,
      payload
    ) VALUES (
      NEW.tenant_id,
      'platform_fee_auto_waived',
      NEW.guest_id,  -- Use guest_id as the actor since cancellation might be system-initiated
      NEW.id,
      jsonb_build_object(
        'booking_id', NEW.id,
        'booking_reference', NEW.booking_reference,
        'reason', 'Booking canceled',
        'auto_waived', true
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on bookings table
DROP TRIGGER IF EXISTS trg_booking_cancel_waive_fee ON bookings;

CREATE TRIGGER trg_booking_cancel_waive_fee
  AFTER UPDATE OF status ON bookings
  FOR EACH ROW
  WHEN (NEW.status = 'cancelled')
  EXECUTE FUNCTION handle_platform_fee_on_booking_cancel();

-- Add comment for documentation
COMMENT ON FUNCTION handle_platform_fee_on_booking_cancel() IS 
  'Automatically waives platform fees when a booking is canceled. Only affects pending/billed fees, not settled ones.';

COMMENT ON TRIGGER trg_booking_cancel_waive_fee ON bookings IS 
  'Auto-waives platform fees when booking status changes to cancelled';