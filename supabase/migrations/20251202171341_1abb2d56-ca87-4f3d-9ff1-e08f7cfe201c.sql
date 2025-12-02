-- GROUP-POOLED-CHECKOUT-V1: Create RPC for group pooled funds checkout logic
-- This function checks if a group room can checkout based on pooled group payments

CREATE OR REPLACE FUNCTION public.can_checkout_group_room(p_booking_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant_id UUID;
  v_group_id TEXT;
  v_room_balance NUMERIC;
  v_group_total_charges NUMERIC;
  v_group_total_payments NUMERIC;
  v_group_balance NUMERIC;
  v_can_checkout BOOLEAN;
BEGIN
  -- 1. Get tenant_id and group_id from booking
  SELECT b.tenant_id, b.metadata->>'group_id'
  INTO v_tenant_id, v_group_id
  FROM bookings b
  WHERE b.id = p_booking_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'can_checkout', NULL,
      'error', 'BOOKING_NOT_FOUND',
      'version', 'GROUP-POOLED-CHECKOUT-V1'
    );
  END IF;
  
  -- 2. If NOT a group booking, return NULL (use normal logic)
  IF v_group_id IS NULL THEN
    RETURN jsonb_build_object(
      'can_checkout', NULL,
      'is_group', false,
      'message', 'Not a group booking - use standard checkout logic',
      'version', 'GROUP-POOLED-CHECKOUT-V1'
    );
  END IF;
  
  -- 3. Get this room's folio balance
  SELECT COALESCE(sf.balance, 0)
  INTO v_room_balance
  FROM stay_folios sf
  WHERE sf.booking_id = p_booking_id
    AND sf.tenant_id = v_tenant_id
    AND sf.folio_type = 'room'
    AND sf.status = 'open'
  LIMIT 1;
  
  -- If room folio balance <= 0 (paid or credit), allow checkout immediately
  IF v_room_balance IS NOT NULL AND v_room_balance <= 0.01 THEN
    RETURN jsonb_build_object(
      'can_checkout', true,
      'is_group', true,
      'reason', 'ROOM_PAID_OR_CREDIT',
      'room_balance', v_room_balance,
      'version', 'GROUP-POOLED-CHECKOUT-V1'
    );
  END IF;
  
  -- 4. Calculate GROUP total from ALL room folios in the group
  SELECT 
    COALESCE(SUM(sf.total_charges), 0),
    COALESCE(SUM(sf.total_payments), 0),
    COALESCE(SUM(sf.balance), 0)
  INTO v_group_total_charges, v_group_total_payments, v_group_balance
  FROM stay_folios sf
  JOIN bookings b ON b.id = sf.booking_id
  WHERE b.metadata->>'group_id' = v_group_id
    AND b.tenant_id = v_tenant_id
    AND sf.folio_type = 'room';
  
  -- 5. Checkout permit rules
  -- Allow if group total balance <= 0 (fully paid or credit)
  IF v_group_balance <= 0.01 THEN
    v_can_checkout := true;
  ELSE
    -- Block: both room AND group have outstanding balance
    v_can_checkout := false;
  END IF;
  
  RETURN jsonb_build_object(
    'can_checkout', v_can_checkout,
    'is_group', true,
    'group_id', v_group_id,
    'room_balance', v_room_balance,
    'group_total_charges', v_group_total_charges,
    'group_total_payments', v_group_total_payments,
    'group_balance', v_group_balance,
    'reason', CASE 
      WHEN v_can_checkout THEN 'GROUP_POOL_BALANCED'
      ELSE 'GROUP_BALANCE_DUE'
    END,
    'version', 'GROUP-POOLED-CHECKOUT-V1'
  );
END;
$function$;

-- Add comment for documentation
COMMENT ON FUNCTION public.can_checkout_group_room(uuid) IS 'GROUP-POOLED-CHECKOUT-V1: Check if a group room can checkout based on pooled group payments. Returns NULL for non-group bookings to use standard logic.';