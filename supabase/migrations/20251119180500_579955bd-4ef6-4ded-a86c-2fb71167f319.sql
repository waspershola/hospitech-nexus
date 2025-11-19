-- Phase 4: Data Integrity Triggers for Group Booking System
-- Version: GROUP-TRIGGERS-V1
-- Purpose: Ensure group booking data consistency and master folio relationships

-- =====================================================
-- Trigger 1: Auto-update group size when bookings change
-- =====================================================
CREATE OR REPLACE FUNCTION update_group_size()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update group_size when booking is added to a group
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.metadata->>'group_id' IS NOT NULL THEN
    UPDATE group_bookings
    SET 
      group_size = (
        SELECT COUNT(*)
        FROM bookings
        WHERE tenant_id = NEW.tenant_id
          AND metadata->>'group_id' = NEW.metadata->>'group_id'
          AND status NOT IN ('cancelled')
      ),
      updated_at = NOW()
    WHERE tenant_id = NEW.tenant_id
      AND group_id = NEW.metadata->>'group_id';
  END IF;

  -- Update group_size when booking is removed from a group
  IF (TG_OP = 'DELETE' OR TG_OP = 'UPDATE') AND OLD.metadata->>'group_id' IS NOT NULL THEN
    UPDATE group_bookings
    SET 
      group_size = (
        SELECT COUNT(*)
        FROM bookings
        WHERE tenant_id = OLD.tenant_id
          AND metadata->>'group_id' = OLD.metadata->>'group_id'
          AND status NOT IN ('cancelled')
      ),
      updated_at = NOW()
    WHERE tenant_id = OLD.tenant_id
      AND group_id = OLD.metadata->>'group_id';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_group_size ON bookings;

CREATE TRIGGER trigger_update_group_size
  AFTER INSERT OR UPDATE OR DELETE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_group_size();

-- =====================================================
-- Trigger 2: Validate master folio relationships
-- =====================================================
CREATE OR REPLACE FUNCTION validate_group_master_folio()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_master_folio_id uuid;
BEGIN
  -- Only validate for group master folios
  IF NEW.folio_type = 'group_master' THEN
    -- Ensure group_master folios don't have parent_folio_id
    IF NEW.parent_folio_id IS NOT NULL THEN
      RAISE EXCEPTION 'Group master folios cannot have a parent folio';
    END IF;
  END IF;

  -- Validate child folio relationships
  IF NEW.folio_type = 'room' AND NEW.parent_folio_id IS NOT NULL THEN
    -- Ensure parent is a group_master type
    SELECT id INTO v_master_folio_id
    FROM stay_folios
    WHERE id = NEW.parent_folio_id
      AND tenant_id = NEW.tenant_id
      AND folio_type = 'group_master';
    
    IF v_master_folio_id IS NULL THEN
      RAISE EXCEPTION 'Parent folio must be of type group_master';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_validate_group_master_folio ON stay_folios;

CREATE TRIGGER trigger_validate_group_master_folio
  BEFORE INSERT OR UPDATE ON stay_folios
  FOR EACH ROW
  EXECUTE FUNCTION validate_group_master_folio();

-- =====================================================
-- Trigger 3: Update group_bookings status based on bookings
-- =====================================================
CREATE OR REPLACE FUNCTION sync_group_booking_status()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_group_id text;
  v_all_statuses text[];
  v_new_status text;
BEGIN
  v_group_id := COALESCE(NEW.metadata->>'group_id', OLD.metadata->>'group_id');
  
  IF v_group_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Get all booking statuses for this group
  SELECT ARRAY_AGG(DISTINCT status) INTO v_all_statuses
  FROM bookings
  WHERE tenant_id = COALESCE(NEW.tenant_id, OLD.tenant_id)
    AND metadata->>'group_id' = v_group_id;

  -- Determine group status based on booking statuses
  IF 'cancelled' = ALL(v_all_statuses) THEN
    v_new_status := 'cancelled';
  ELSIF 'completed' = ALL(v_all_statuses) THEN
    v_new_status := 'completed';
  ELSIF 'checked_in' = ANY(v_all_statuses) THEN
    v_new_status := 'in_house';
  ELSIF 'reserved' = ALL(v_all_statuses) THEN
    v_new_status := 'reserved';
  ELSE
    v_new_status := 'partial';
  END IF;

  -- Update group_bookings status
  UPDATE group_bookings
  SET 
    status = v_new_status,
    updated_at = NOW()
  WHERE tenant_id = COALESCE(NEW.tenant_id, OLD.tenant_id)
    AND group_id = v_group_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_group_booking_status ON bookings;

CREATE TRIGGER trigger_sync_group_booking_status
  AFTER INSERT OR UPDATE OR DELETE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION sync_group_booking_status();

-- =====================================================
-- Trigger 4: Prevent orphaning of child folios
-- =====================================================
CREATE OR REPLACE FUNCTION prevent_master_folio_deletion()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_child_count integer;
BEGIN
  -- Only check for group_master folios
  IF OLD.folio_type = 'group_master' THEN
    -- Check if there are child folios
    SELECT COUNT(*) INTO v_child_count
    FROM stay_folios
    WHERE tenant_id = OLD.tenant_id
      AND parent_folio_id = OLD.id
      AND status != 'closed';

    IF v_child_count > 0 THEN
      RAISE EXCEPTION 'Cannot delete group master folio with % open child folios. Close all child folios first.', v_child_count;
    END IF;
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trigger_prevent_master_folio_deletion ON stay_folios;

CREATE TRIGGER trigger_prevent_master_folio_deletion
  BEFORE DELETE ON stay_folios
  FOR EACH ROW
  EXECUTE FUNCTION prevent_master_folio_deletion();