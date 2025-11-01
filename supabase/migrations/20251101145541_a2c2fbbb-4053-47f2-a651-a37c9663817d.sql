-- Create v_today_payments view for live dashboard feed
CREATE OR REPLACE VIEW v_today_payments AS
SELECT 
  p.id,
  p.created_at,
  p.amount,
  p.method,
  p.method_provider,
  p.department,
  p.payment_type,
  p.status,
  p.booking_id,
  p.organization_id,
  p.guest_id,
  g.name AS guest_name,
  o.name AS org_name,
  r.number AS room_number,
  prof.full_name AS staff_name,
  p.tenant_id
FROM payments p
LEFT JOIN guests g ON g.id = p.guest_id
LEFT JOIN organizations o ON o.id = p.organization_id
LEFT JOIN bookings b ON b.id = p.booking_id
LEFT JOIN rooms r ON r.id = b.room_id
LEFT JOIN profiles prof ON prof.id = p.recorded_by
WHERE p.created_at::date = current_date
ORDER BY p.created_at DESC;