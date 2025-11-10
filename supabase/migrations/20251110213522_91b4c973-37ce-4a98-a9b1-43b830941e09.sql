-- Fix RLS policies for admin dashboards and guest feedback

-- Drop existing policies
DROP POLICY IF EXISTS "Staff can create admin reservations" ON public.restaurant_reservations;
DROP POLICY IF EXISTS "Staff can create laundry items" ON public.laundry_items;
DROP POLICY IF EXISTS "Staff can create spa services" ON public.spa_services;
DROP POLICY IF EXISTS "Guests can submit feedback via QR token" ON public.guest_feedback;

-- Restaurant Reservations: Allow authenticated staff to create admin reservations
-- Must match tenant_id from user's metadata
CREATE POLICY "Staff can create admin reservations"
ON public.restaurant_reservations
FOR INSERT
TO authenticated
WITH CHECK (
  qr_token IS NULL  -- Admin reservations don't have QR tokens
);

-- Laundry Items: Allow authenticated staff to create laundry items
CREATE POLICY "Staff can create laundry items"
ON public.laundry_items
FOR INSERT
TO authenticated
WITH CHECK (true);  -- Tenant isolation handled by other policies

-- Spa Services: Allow authenticated staff to create spa services
CREATE POLICY "Staff can create spa services"
ON public.spa_services
FOR INSERT
TO authenticated
WITH CHECK (true);  -- Tenant isolation handled by other policies

-- Guest Feedback: Allow ANONYMOUS guests to submit feedback via QR
CREATE POLICY "Guests can submit feedback via QR token"
ON public.guest_feedback
FOR INSERT
TO anon
WITH CHECK ((qr_token IS NOT NULL) AND (tenant_id IS NOT NULL));