-- ============================================================================
-- Migration: Fix RLS ALL policy conflicts by splitting into separate policies
-- Issue: FOR ALL policies without explicit WITH CHECK reuse USING for INSERT
-- Solution: Create separate SELECT/UPDATE/DELETE and INSERT policies
-- ============================================================================

-- ============================================================================
-- TABLE: spa_services
-- ============================================================================

-- Drop conflicting ALL policy and existing basic INSERT policy
DROP POLICY IF EXISTS "Staff can manage spa services" ON public.spa_services;
DROP POLICY IF EXISTS "Staff can create spa services" ON public.spa_services;

-- Create SELECT policy (visibility checks)
CREATE POLICY "spa_services_select"
ON public.spa_services
FOR SELECT
TO public
USING (
  (tenant_id = get_user_tenant(auth.uid()))
  AND (
    has_role(auth.uid(), tenant_id, 'owner'::app_role) OR
    has_role(auth.uid(), tenant_id, 'manager'::app_role) OR
    has_role(auth.uid(), tenant_id, 'spa'::app_role)
  )
);

-- Create UPDATE policy
CREATE POLICY "spa_services_update"
ON public.spa_services
FOR UPDATE
TO public
USING (
  (tenant_id = get_user_tenant(auth.uid()))
  AND (
    has_role(auth.uid(), tenant_id, 'owner'::app_role) OR
    has_role(auth.uid(), tenant_id, 'manager'::app_role) OR
    has_role(auth.uid(), tenant_id, 'spa'::app_role)
  )
)
WITH CHECK (
  tenant_id = get_user_tenant(auth.uid())
);

-- Create DELETE policy
CREATE POLICY "spa_services_delete"
ON public.spa_services
FOR DELETE
TO public
USING (
  (tenant_id = get_user_tenant(auth.uid()))
  AND (
    has_role(auth.uid(), tenant_id, 'owner'::app_role) OR
    has_role(auth.uid(), tenant_id, 'manager'::app_role) OR
    has_role(auth.uid(), tenant_id, 'spa'::app_role)
  )
);

-- Create secure INSERT policy with explicit WITH CHECK
CREATE POLICY "spa_services_insert"
ON public.spa_services
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = get_user_tenant(auth.uid())
  AND (
    has_role(auth.uid(), tenant_id, 'owner'::app_role) OR
    has_role(auth.uid(), tenant_id, 'manager'::app_role) OR
    has_role(auth.uid(), tenant_id, 'spa'::app_role)
  )
);

-- ============================================================================
-- TABLE: laundry_items
-- ============================================================================

DROP POLICY IF EXISTS "Staff can manage laundry items" ON public.laundry_items;
DROP POLICY IF EXISTS "Staff can create laundry items" ON public.laundry_items;

-- Create SELECT policy
CREATE POLICY "laundry_items_select"
ON public.laundry_items
FOR SELECT
TO public
USING (
  (tenant_id = get_user_tenant(auth.uid()))
  AND (
    has_role(auth.uid(), tenant_id, 'owner'::app_role) OR
    has_role(auth.uid(), tenant_id, 'manager'::app_role) OR
    has_role(auth.uid(), tenant_id, 'housekeeping'::app_role)
  )
);

-- Create UPDATE policy
CREATE POLICY "laundry_items_update"
ON public.laundry_items
FOR UPDATE
TO public
USING (
  (tenant_id = get_user_tenant(auth.uid()))
  AND (
    has_role(auth.uid(), tenant_id, 'owner'::app_role) OR
    has_role(auth.uid(), tenant_id, 'manager'::app_role) OR
    has_role(auth.uid(), tenant_id, 'housekeeping'::app_role)
  )
)
WITH CHECK (
  tenant_id = get_user_tenant(auth.uid())
);

-- Create DELETE policy
CREATE POLICY "laundry_items_delete"
ON public.laundry_items
FOR DELETE
TO public
USING (
  (tenant_id = get_user_tenant(auth.uid()))
  AND (
    has_role(auth.uid(), tenant_id, 'owner'::app_role) OR
    has_role(auth.uid(), tenant_id, 'manager'::app_role) OR
    has_role(auth.uid(), tenant_id, 'housekeeping'::app_role)
  )
);

-- Create secure INSERT policy
CREATE POLICY "laundry_items_insert"
ON public.laundry_items
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = get_user_tenant(auth.uid())
  AND (
    has_role(auth.uid(), tenant_id, 'owner'::app_role) OR
    has_role(auth.uid(), tenant_id, 'manager'::app_role) OR
    has_role(auth.uid(), tenant_id, 'housekeeping'::app_role)
  )
);

-- ============================================================================
-- TABLE: restaurant_reservations
-- ============================================================================

DROP POLICY IF EXISTS "Staff can manage reservations" ON public.restaurant_reservations;
DROP POLICY IF EXISTS "Staff can create admin reservations" ON public.restaurant_reservations;

-- Create SELECT policy
CREATE POLICY "restaurant_reservations_select"
ON public.restaurant_reservations
FOR SELECT
TO public
USING (
  (tenant_id = get_user_tenant(auth.uid()))
  AND (
    has_role(auth.uid(), tenant_id, 'owner'::app_role) OR
    has_role(auth.uid(), tenant_id, 'manager'::app_role) OR
    has_role(auth.uid(), tenant_id, 'restaurant'::app_role) OR
    has_role(auth.uid(), tenant_id, 'frontdesk'::app_role)
  )
);

-- Create UPDATE policy
CREATE POLICY "restaurant_reservations_update"
ON public.restaurant_reservations
FOR UPDATE
TO public
USING (
  (tenant_id = get_user_tenant(auth.uid()))
  AND (
    has_role(auth.uid(), tenant_id, 'owner'::app_role) OR
    has_role(auth.uid(), tenant_id, 'manager'::app_role) OR
    has_role(auth.uid(), tenant_id, 'restaurant'::app_role) OR
    has_role(auth.uid(), tenant_id, 'frontdesk'::app_role)
  )
)
WITH CHECK (
  tenant_id = get_user_tenant(auth.uid())
);

-- Create DELETE policy
CREATE POLICY "restaurant_reservations_delete"
ON public.restaurant_reservations
FOR DELETE
TO public
USING (
  (tenant_id = get_user_tenant(auth.uid()))
  AND (
    has_role(auth.uid(), tenant_id, 'owner'::app_role) OR
    has_role(auth.uid(), tenant_id, 'manager'::app_role) OR
    has_role(auth.uid(), tenant_id, 'restaurant'::app_role) OR
    has_role(auth.uid(), tenant_id, 'frontdesk'::app_role)
  )
);

-- Admin reservations: must have NULL qr_token and correct tenant + authorized role
CREATE POLICY "restaurant_reservations_insert_admin"
ON public.restaurant_reservations
FOR INSERT
TO authenticated
WITH CHECK (
  qr_token IS NULL
  AND tenant_id = get_user_tenant(auth.uid())
  AND (
    has_role(auth.uid(), tenant_id, 'owner'::app_role) OR
    has_role(auth.uid(), tenant_id, 'manager'::app_role) OR
    has_role(auth.uid(), tenant_id, 'restaurant'::app_role) OR
    has_role(auth.uid(), tenant_id, 'frontdesk'::app_role)
  )
);