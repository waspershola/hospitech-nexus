-- Marker: REALTIME-INFRASTRUCTURE-RESTORE-V1
-- Fix for broken notifications: restore supabase_realtime publication

-- Enable REPLICA IDENTITY FULL for complete row data during realtime updates
ALTER TABLE requests REPLICA IDENTITY FULL;
ALTER TABLE guest_communications REPLICA IDENTITY FULL;
ALTER TABLE stay_folios REPLICA IDENTITY FULL;
ALTER TABLE folio_transactions REPLICA IDENTITY FULL;
ALTER TABLE payments REPLICA IDENTITY FULL;
ALTER TABLE bookings REPLICA IDENTITY FULL;
ALTER TABLE rooms REPLICA IDENTITY FULL;

-- Add all critical tables to supabase_realtime publication
-- This enables real-time subscriptions for:
-- - QR request notifications (requests, guest_communications)
-- - Folio updates (stay_folios, folio_transactions)
-- - Payment tracking (payments)
-- - Room status sync (bookings, rooms)
ALTER PUBLICATION supabase_realtime ADD TABLE requests;
ALTER PUBLICATION supabase_realtime ADD TABLE guest_communications;
ALTER PUBLICATION supabase_realtime ADD TABLE stay_folios;
ALTER PUBLICATION supabase_realtime ADD TABLE folio_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE payments;
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;