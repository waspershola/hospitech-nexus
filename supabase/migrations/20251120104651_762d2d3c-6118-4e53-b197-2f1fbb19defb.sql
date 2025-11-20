-- Repair bookings without folios (idempotent)
DO $$
DECLARE
  v_booking RECORD;
  v_folio_number TEXT;
  v_folio_id UUID;
  v_repaired INTEGER := 0;
BEGIN
  FOR v_booking IN
    SELECT b.id, b.tenant_id, b.room_id, b.guest_id, b.total_amount, b.metadata
    FROM bookings b
    LEFT JOIN stay_folios f ON f.booking_id = b.id AND f.status = 'open'
    WHERE b.status = 'checked_in' AND f.id IS NULL
    LIMIT 20
  LOOP
    BEGIN
      v_folio_number := 'FRR-' || TO_CHAR(NOW(), 'YYYY-MM-DDDD-') || LPAD((random()*10000)::TEXT, 4, '0');
      
      INSERT INTO stay_folios (
        tenant_id, booking_id, room_id, guest_id, folio_type, folio_number,
        is_primary, total_charges, balance, status, metadata
      ) VALUES (
        v_booking.tenant_id, v_booking.id, v_booking.room_id, v_booking.guest_id,
        'room', v_folio_number, true, COALESCE(v_booking.total_amount, 0),
        COALESCE(v_booking.total_amount, 0), 'open',
        jsonb_build_object('repair_reason', 'Emergency repair', 'repaired_at', now())
      ) RETURNING id INTO v_folio_id;
      
      v_repaired := v_repaired + 1;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
  
  RAISE NOTICE 'Repaired % bookings', v_repaired;
END;
$$;