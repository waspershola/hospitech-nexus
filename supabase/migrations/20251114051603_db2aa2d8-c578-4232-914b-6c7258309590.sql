-- Fix trigger function to use auth.uid() instead of guest_id for user_id
-- This prevents foreign key constraint violations on finance_audit_events

CREATE OR REPLACE FUNCTION public.handle_platform_fee_on_booking_cancel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    
    -- Log the action for audit trail (use auth.uid() instead of guest_id)
    INSERT INTO finance_audit_events (
      tenant_id,
      event_type,
      user_id,
      target_id,
      payload
    ) VALUES (
      NEW.tenant_id,
      'platform_fee_auto_waived',
      auth.uid(),  -- Use current authenticated user instead of guest_id
      NEW.id,
      jsonb_build_object(
        'booking_id', NEW.id,
        'booking_reference', NEW.booking_reference,
        'guest_id', NEW.guest_id,
        'reason', 'Booking canceled',
        'auto_waived', true
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$;