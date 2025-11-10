-- Phase 1: Fix WiFi RLS - Allow guests to view active WiFi credentials
CREATE POLICY "Guests can view active WiFi credentials via QR"
ON wifi_credentials
FOR SELECT
TO public
USING (is_active = true);

-- Phase 2: Fix Guest Feedback RLS - Update INSERT policy
DROP POLICY IF EXISTS "Feedback insertable by anyone with QR token" ON guest_feedback;

CREATE POLICY "Guests can submit feedback via QR token"
ON guest_feedback
FOR INSERT
TO public
WITH CHECK (
  qr_token IS NOT NULL 
  AND tenant_id IS NOT NULL
);

-- Phase 3: Guest Booking Policies
-- Note: These policies allow QR guests to create laundry orders and spa bookings
-- Only add if the tables exist (they might be created in future migrations)

-- Check if laundry_orders table exists and add policy
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'laundry_orders'
  ) THEN
    EXECUTE 'CREATE POLICY IF NOT EXISTS "Guests can create laundry orders via QR" 
             ON laundry_orders FOR INSERT TO public 
             WITH CHECK (qr_token IS NOT NULL)';
  END IF;
END $$;

-- Check if spa_bookings table exists and add policy
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'spa_bookings'
  ) THEN
    EXECUTE 'CREATE POLICY IF NOT EXISTS "Guests can create spa bookings via QR" 
             ON spa_bookings FOR INSERT TO public 
             WITH CHECK (qr_token IS NOT NULL)';
  END IF;
END $$;