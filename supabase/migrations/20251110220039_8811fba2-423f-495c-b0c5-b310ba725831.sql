-- Fix RLS policies to support users without user_roles entries (fallback to JWT metadata)
-- This allows users to insert if tenant_id matches their JWT metadata OR they have proper role

-- ============================================================================
-- TABLE: spa_services - Add JWT metadata fallback
-- ============================================================================

DROP POLICY IF EXISTS "spa_services_insert" ON public.spa_services;

CREATE POLICY "spa_services_insert"
ON public.spa_services
FOR INSERT
TO authenticated
WITH CHECK (
  -- Check 1: Proper role-based check (preferred)
  (
    tenant_id = get_user_tenant(auth.uid())
    AND (
      has_role(auth.uid(), tenant_id, 'owner'::app_role) OR
      has_role(auth.uid(), tenant_id, 'manager'::app_role) OR
      has_role(auth.uid(), tenant_id, 'spa'::app_role)
    )
  )
  -- Check 2: Fallback for users without user_roles entries
  OR (
    tenant_id::text = (auth.jwt() -> 'user_metadata' ->> 'tenantId')
  )
);

-- ============================================================================
-- TABLE: laundry_items - Add JWT metadata fallback
-- ============================================================================

DROP POLICY IF EXISTS "laundry_items_insert" ON public.laundry_items;

CREATE POLICY "laundry_items_insert"
ON public.laundry_items
FOR INSERT
TO authenticated
WITH CHECK (
  (
    tenant_id = get_user_tenant(auth.uid())
    AND (
      has_role(auth.uid(), tenant_id, 'owner'::app_role) OR
      has_role(auth.uid(), tenant_id, 'manager'::app_role) OR
      has_role(auth.uid(), tenant_id, 'housekeeping'::app_role)
    )
  )
  OR (
    tenant_id::text = (auth.jwt() -> 'user_metadata' ->> 'tenantId')
  )
);

-- ============================================================================
-- TABLE: restaurant_reservations - Add JWT metadata fallback
-- ============================================================================

DROP POLICY IF EXISTS "restaurant_reservations_insert_admin" ON public.restaurant_reservations;

CREATE POLICY "restaurant_reservations_insert_admin"
ON public.restaurant_reservations
FOR INSERT
TO authenticated
WITH CHECK (
  qr_token IS NULL
  AND (
    (
      tenant_id = get_user_tenant(auth.uid())
      AND (
        has_role(auth.uid(), tenant_id, 'owner'::app_role) OR
        has_role(auth.uid(), tenant_id, 'manager'::app_role) OR
        has_role(auth.uid(), tenant_id, 'restaurant'::app_role) OR
        has_role(auth.uid(), tenant_id, 'frontdesk'::app_role)
      )
    )
    OR (
      tenant_id::text = (auth.jwt() -> 'user_metadata' ->> 'tenantId')
    )
  )
);