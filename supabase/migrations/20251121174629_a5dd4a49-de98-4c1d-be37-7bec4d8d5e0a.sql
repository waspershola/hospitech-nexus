-- FOLIO-CLEANUP-V3: Reset ANY checked_in bookings without open folios
-- AND add DB trigger to prevent this from happening again

-- Step 1: Clean up Room 107 and any other new broken cases
UPDATE bookings b
SET 
  status = 'reserved',
  metadata = jsonb_set(
    COALESCE(b.metadata, '{}'::jsonb),
    '{reset_reason}',
    '"Booking was in checked_in status without folio - reset again for proper check-in (FOLIO-CLEANUP-V3)"'
  )
WHERE 
  b.tenant_id = '5cba9022-1f70-4b68-bb33-38e83194b0c2'
  AND b.status = 'checked_in'
  AND NOT EXISTS (
    SELECT 1 FROM stay_folios sf
    WHERE sf.booking_id = b.id
      AND sf.tenant_id = b.tenant_id
      AND sf.status = 'open'
  );

-- Reset corresponding rooms to reserved if they're currently occupied
UPDATE rooms r
SET status = 'reserved'
WHERE 
  r.tenant_id = '5cba9022-1f70-4b68-bb33-38e83194b0c2'
  AND r.status = 'occupied'
  AND EXISTS (
    SELECT 1
    FROM bookings b
    WHERE 
      b.room_id = r.id
      AND b.tenant_id = r.tenant_id
      AND b.status = 'reserved'
      AND b.metadata->>'reset_reason' LIKE '%FOLIO-CLEANUP-V3%'
  );

-- Step 2: Add DB-level guardrail to prevent checked_in without folio
CREATE OR REPLACE FUNCTION public.validate_checkin_has_folio()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_folio_id uuid;
BEGIN
  -- Only care when status changes TO checked_in
  IF NEW.status = 'checked_in' AND (OLD.status IS NULL OR OLD.status IS DISTINCT FROM NEW.status) THEN
    -- Look for an open folio for this booking
    SELECT id INTO v_folio_id
    FROM stay_folios
    WHERE booking_id = NEW.id
      AND tenant_id = NEW.tenant_id
      AND status = 'open'
    LIMIT 1;

    IF v_folio_id IS NULL THEN
      RAISE EXCEPTION 'Cannot set booking to checked_in without an open folio (booking_id: %)', NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_validate_checkin_has_folio ON bookings;
CREATE TRIGGER trg_validate_checkin_has_folio
BEFORE UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION public.validate_checkin_has_folio();