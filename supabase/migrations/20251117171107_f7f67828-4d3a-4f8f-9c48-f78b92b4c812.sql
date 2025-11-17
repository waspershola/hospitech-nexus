
-- Create missing folio for Room 200 (BKG-2025-321-DAEB60)
-- This booking is checked_in but has no folio

DO $$
DECLARE
  v_booking_id uuid := 'daeb6002-ef95-4209-92dd-eecb2e938b1a';
  v_booking bookings;
  v_folio_id uuid;
BEGIN
  -- Get booking details
  SELECT * INTO v_booking FROM bookings WHERE id = v_booking_id;
  
  IF v_booking.id IS NULL THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;
  
  -- Check if folio already exists (idempotency)
  IF EXISTS (SELECT 1 FROM stay_folios WHERE booking_id = v_booking_id) THEN
    RAISE NOTICE 'Folio already exists for booking %', v_booking_id;
    RETURN;
  END IF;
  
  -- Create folio
  INSERT INTO stay_folios (
    tenant_id,
    booking_id,
    guest_id,
    room_id,
    total_charges,
    total_payments,
    balance,
    status
  ) VALUES (
    v_booking.tenant_id,
    v_booking.id,
    v_booking.guest_id,
    v_booking.room_id,
    COALESCE(v_booking.total_amount, 0),
    0,
    COALESCE(v_booking.total_amount, 0),
    'open'
  ) RETURNING id INTO v_folio_id;
  
  -- Create initial charge transaction
  IF v_booking.total_amount > 0 THEN
    INSERT INTO folio_transactions (
      tenant_id,
      folio_id,
      transaction_type,
      amount,
      description,
      reference_type,
      reference_id
    ) VALUES (
      v_booking.tenant_id,
      v_folio_id,
      'charge',
      v_booking.total_amount,
      'Room booking charge',
      'booking',
      v_booking.id
    );
  END IF;
  
  RAISE NOTICE 'Created folio % for booking %', v_folio_id, v_booking_id;
END $$;

-- Verify the fix
SELECT 
  b.booking_reference,
  b.status,
  sf.id as folio_id,
  sf.total_charges,
  sf.balance
FROM bookings b
LEFT JOIN stay_folios sf ON sf.booking_id = b.id
WHERE b.id = 'daeb6002-ef95-4209-92dd-eecb2e938b1a';
