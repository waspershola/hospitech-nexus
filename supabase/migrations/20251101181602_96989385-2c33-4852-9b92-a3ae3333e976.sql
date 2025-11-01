-- Fix security warnings: Set search_path for functions

-- Fix generate_booking_reference function
CREATE OR REPLACE FUNCTION generate_booking_reference()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.booking_reference IS NULL THEN
    NEW.booking_reference := 'BKG-' || 
                            EXTRACT(YEAR FROM NEW.created_at)::text || '-' || 
                            LPAD(EXTRACT(DOY FROM NEW.created_at)::text, 3, '0') || '-' || 
                            UPPER(SUBSTRING(NEW.id::text, 1, 6));
  END IF;
  RETURN NEW;
END;
$$;

-- Fix update_guest_stats function
CREATE OR REPLACE FUNCTION update_guest_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update guest stats when booking is checked out
  IF NEW.status = 'checked_out' AND (OLD.status IS NULL OR OLD.status != 'checked_out') THEN
    UPDATE guests
    SET 
      total_bookings = COALESCE(total_bookings, 0) + 1,
      last_stay_date = NEW.check_out,
      total_spent = COALESCE(total_spent, 0) + COALESCE(NEW.total_amount, 0)
    WHERE id = NEW.guest_id;
  END IF;
  
  RETURN NEW;
END;
$$;