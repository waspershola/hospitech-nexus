-- Drop existing policies
DROP POLICY IF EXISTS "Staff can create admin reservations" ON public.restaurant_reservations;
DROP POLICY IF EXISTS "Staff can create laundry items" ON public.laundry_items;
DROP POLICY IF EXISTS "Staff can create spa services" ON public.spa_services;

-- Create secure INSERT policies using get_user_tenant function

-- Restaurant Reservations: Allow authenticated staff to create admin reservations
CREATE POLICY "Staff can create admin reservations"
ON public.restaurant_reservations
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = get_user_tenant(auth.uid())
  AND qr_token IS NULL  -- Admin reservations don't have QR tokens
);

-- Laundry Items: Allow authenticated staff to create laundry items
CREATE POLICY "Staff can create laundry items"
ON public.laundry_items
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = get_user_tenant(auth.uid())
);

-- Spa Services: Allow authenticated staff to create spa services
CREATE POLICY "Staff can create spa services"
ON public.spa_services
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = get_user_tenant(auth.uid())
);