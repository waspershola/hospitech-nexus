-- Phase 4: Close folios automatically on checkout
-- This trigger ensures folios are closed when bookings are completed

CREATE OR REPLACE FUNCTION close_folio_on_checkout()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed when status changes TO 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Close any open folios for this booking
    UPDATE stay_folios
    SET 
      status = 'closed',
      updated_at = NOW()
    WHERE booking_id = NEW.id 
      AND status = 'open';
      
    -- Log the folio closure for audit trail
    INSERT INTO finance_audit_events (
      tenant_id,
      event_type,
      user_id,
      target_id,
      payload
    )
    SELECT 
      NEW.tenant_id,
      'folio_auto_closed',
      auth.uid(),
      id,
      jsonb_build_object(
        'booking_id', NEW.id,
        'booking_reference', NEW.booking_reference,
        'reason', 'Booking completed - checkout'
      )
    FROM stay_folios
    WHERE booking_id = NEW.id 
      AND status = 'closed'
      AND updated_at >= NOW() - INTERVAL '1 second';  -- Just closed
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the trigger on bookings table
DROP TRIGGER IF EXISTS trg_close_folio_on_checkout ON bookings;

CREATE TRIGGER trg_close_folio_on_checkout
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION close_folio_on_checkout();