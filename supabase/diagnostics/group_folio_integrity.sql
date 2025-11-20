-- ============================================================================
-- GROUP BOOKING / GROUP MASTER FOLIO DIAGNOSTICS (READ-ONLY)
-- Date: 2025-11-20
-- Purpose: Diagnostic queries to identify group booking issues
-- Usage: Run these queries manually or via booking_room_integrity_diagnostics RPC
-- ============================================================================

-- Query 1: Groups with metadata but no group master folio
-- This identifies incomplete group booking setup
SELECT
  b.metadata->>'group_id' AS group_id,
  b.metadata->>'group_name' AS group_name,
  COUNT(DISTINCT b.id) AS booking_count,
  MIN(b.check_in) AS first_arrival,
  MAX(b.check_out) AS last_departure,
  BOOL_OR(sf.folio_type = 'group_master') AS has_group_master_folio,
  STRING_AGG(DISTINCT b.booking_reference, ', ') AS booking_references
FROM bookings b
LEFT JOIN stay_folios sf ON sf.booking_id = b.id
WHERE b.metadata ? 'group_id'
  AND b.check_out::date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY b.metadata->>'group_id', b.metadata->>'group_name'
ORDER BY MIN(b.check_in) DESC;

-- Query 2: Linked child folios vs master
-- Shows parent-child folio relationships
SELECT
  sf.id AS folio_id,
  sf.folio_number,
  sf.folio_type,
  sf.parent_folio_id,
  parent.folio_number AS parent_folio_number,
  parent.folio_type AS parent_folio_type,
  sf.booking_id,
  b.booking_reference,
  sf.total_charges,
  sf.total_payments,
  sf.balance,
  sf.status
FROM stay_folios sf
LEFT JOIN stay_folios parent ON parent.id = sf.parent_folio_id
LEFT JOIN bookings b ON b.id = sf.booking_id
WHERE sf.folio_type IN ('group', 'group_master', 'room')
  AND (sf.parent_folio_id IS NOT NULL OR sf.folio_type = 'group_master')
ORDER BY sf.parent_folio_id NULLS FIRST, sf.folio_type, sf.created_at;

-- Query 3: Group folio aggregation totals
-- Calculates total charges, payments, and balances per group
SELECT
  b.metadata->>'group_id' AS group_id,
  b.metadata->>'group_name' AS group_name,
  COUNT(DISTINCT b.id) AS total_bookings,
  COUNT(DISTINCT sf.id) AS total_folios,
  SUM(sf.total_charges) AS total_charges,
  SUM(sf.total_payments) AS total_payments,
  SUM(sf.balance) AS outstanding_balance,
  STRING_AGG(DISTINCT sf.folio_number, ', ') AS folio_numbers
FROM bookings b
LEFT JOIN stay_folios sf ON sf.booking_id = b.id
WHERE b.metadata ? 'group_id'
  AND b.check_out::date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY b.metadata->>'group_id', b.metadata->>'group_name'
ORDER BY outstanding_balance DESC;

-- Query 4: Orphaned group bookings
-- Bookings with group_id but not in group_bookings table
SELECT
  b.id AS booking_id,
  b.booking_reference,
  b.metadata->>'group_id' AS group_id,
  b.metadata->>'group_name' AS group_name,
  b.check_in,
  b.check_out,
  b.status,
  CASE 
    WHEN gb.id IS NULL THEN 'Missing from group_bookings table'
    ELSE 'Linked correctly'
  END AS group_bookings_status
FROM bookings b
LEFT JOIN group_bookings gb ON gb.group_id::text = b.metadata->>'group_id'
WHERE b.metadata ? 'group_id'
  AND b.check_out::date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY b.check_in DESC;

-- Query 5: Master folios without child folios
-- Group master folios that have no linked room folios
SELECT
  sf.id AS master_folio_id,
  sf.folio_number,
  sf.metadata->>'group_id' AS group_id,
  sf.metadata->>'group_name' AS group_name,
  COUNT(child.id) AS child_folio_count,
  sf.total_charges AS master_total_charges,
  sf.total_payments AS master_total_payments,
  sf.balance AS master_balance
FROM stay_folios sf
LEFT JOIN stay_folios child ON child.parent_folio_id = sf.id
WHERE sf.folio_type = 'group_master'
  AND sf.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY sf.id, sf.folio_number, sf.metadata, sf.total_charges, sf.total_payments, sf.balance
HAVING COUNT(child.id) = 0
ORDER BY sf.created_at DESC;

-- Query 6: Child folios without master folio link
-- Room folios that should be linked to group master but aren't
SELECT
  sf.id AS folio_id,
  sf.folio_number,
  sf.folio_type,
  sf.parent_folio_id,
  b.booking_reference,
  b.metadata->>'group_id' AS group_id,
  b.metadata->>'group_name' AS group_name,
  sf.total_charges,
  sf.balance
FROM stay_folios sf
JOIN bookings b ON b.id = sf.booking_id
WHERE b.metadata ? 'group_id'
  AND sf.folio_type = 'room'
  AND sf.parent_folio_id IS NULL
  AND sf.created_at >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY sf.created_at DESC;

-- Query 7: Group booking RPC test query
-- Tests if get_group_master_folio RPC can be called for each group
SELECT
  DISTINCT b.metadata->>'group_id' AS group_id,
  b.metadata->>'group_name' AS group_name,
  b.tenant_id,
  'Run: SELECT * FROM get_group_master_folio(''' || b.tenant_id || '''::uuid, ''' || b.metadata->>'group_id' || '''::uuid)' AS test_query
FROM bookings b
WHERE b.metadata ? 'group_id'
  AND b.check_out::date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY b.metadata->>'group_name';

-- Query 8: Group bookings table inventory
-- Shows all entries in group_bookings table
SELECT
  gb.id,
  gb.group_id,
  gb.group_name,
  gb.group_size,
  gb.master_booking_id,
  gb.master_folio_id,
  gb.status,
  gb.created_at,
  b.booking_reference AS master_booking_ref,
  sf.folio_number AS master_folio_number
FROM group_bookings gb
LEFT JOIN bookings b ON b.id = gb.master_booking_id
LEFT JOIN stay_folios sf ON sf.id = gb.master_folio_id
ORDER BY gb.created_at DESC
LIMIT 50;
