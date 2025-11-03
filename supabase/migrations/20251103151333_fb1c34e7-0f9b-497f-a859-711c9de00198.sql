-- Step 1: Create department enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'department_type') THEN
    CREATE TYPE public.department_type AS ENUM (
      'front_office',
      'housekeeping',
      'maintenance',
      'food_beverage',
      'kitchen',
      'bar',
      'finance',
      'management',
      'security',
      'spa',
      'concierge',
      'admin'
    );
  END IF;
END$$;

-- Step 2: Create validation function (works with text for now)
CREATE OR REPLACE FUNCTION public.validate_supervisor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  supervisor_dept text;
  supervisor_role text;
BEGIN
  -- If no supervisor, allow
  IF NEW.supervisor_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Check supervisor exists and get their details
  SELECT department::text, role INTO supervisor_dept, supervisor_role
  FROM staff
  WHERE id = NEW.supervisor_id AND tenant_id = NEW.tenant_id;
  
  -- Supervisor must exist
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Supervisor not found in the same tenant';
  END IF;
  
  -- Supervisor must be in same department or be in management
  IF supervisor_dept != NEW.department::text AND supervisor_dept != 'management' THEN
    RAISE EXCEPTION 'Supervisor must be in the same department or management department';
  END IF;
  
  -- Supervisor should have a leadership role
  IF supervisor_role NOT IN ('manager', 'supervisor', 'head', 'director', 'assistant_manager', 'chief') THEN
    RAISE EXCEPTION 'Supervisor must have a leadership role (manager, supervisor, head, director, assistant_manager, chief)';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Step 3: Create trigger for supervisor validation
DROP TRIGGER IF EXISTS validate_supervisor_trigger ON public.staff;
CREATE TRIGGER validate_supervisor_trigger
  BEFORE INSERT OR UPDATE ON public.staff
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_supervisor();

-- Step 4: Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_staff_supervisor_id ON public.staff(supervisor_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_staff_department ON public.staff(department, tenant_id);
CREATE INDEX IF NOT EXISTS idx_staff_role ON public.staff(role, tenant_id);