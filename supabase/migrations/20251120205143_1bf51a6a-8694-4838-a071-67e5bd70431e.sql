-- CHECKOUT-FIX-V1-TRIGGER: Fix sync_room_status_on_booking_change trigger
-- Change room status from 'dirty' to 'cleaning' after checkout
-- 'dirty' is not an allowed status value in rooms_status_check constraint

CREATE OR REPLACE FUNCTION public.sync_room_status_on_booking_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Only sync if status actually changed
  IF (TG_OP = 'INSERT') OR (OLD.status IS DISTINCT FROM NEW.status) THEN
    
    IF NEW.status = 'checked_in' THEN
      -- Mark room as occupied on check-in
      UPDATE rooms
      SET status = 'occupied'
      WHERE id = NEW.room_id AND tenant_id = NEW.tenant_id;
      
      RAISE NOTICE '[sync_room_status] Room % marked as occupied', NEW.room_id;
      
    ELSIF NEW.status = 'reserved' THEN
      -- Mark room as reserved when booking is reserved
      UPDATE rooms
      SET status = 'reserved'
      WHERE id = NEW.room_id AND tenant_id = NEW.tenant_id;
      
      RAISE NOTICE '[sync_room_status] Room % marked as reserved', NEW.room_id;
      
    ELSIF NEW.status = 'completed' AND OLD.status = 'checked_in' THEN
      -- CHECKOUT-FIX-V1: Mark as cleaning (not dirty) if transitioning from checked_in to completed
      -- (Manual checkout process)
      UPDATE rooms
      SET status = 'cleaning'
      WHERE id = NEW.room_id AND tenant_id = NEW.tenant_id;
      
      RAISE NOTICE '[sync_room_status] CHECKOUT-FIX-V1: Room % marked as cleaning after checkout', NEW.room_id;
      
    ELSIF NEW.status = 'cancelled' THEN
      -- Mark room as available when booking is cancelled
      UPDATE rooms
      SET status = 'available'
      WHERE id = NEW.room_id AND tenant_id = NEW.tenant_id;
      
      RAISE NOTICE '[sync_room_status] Room % marked as available after cancellation', NEW.room_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;