-- Fix security warnings: Add search_path to functions that are missing it

-- Fix generate_invoice_number function
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  year TEXT;
  month TEXT;
  sequence_num INTEGER;
BEGIN
  year := TO_CHAR(CURRENT_DATE, 'YYYY');
  month := TO_CHAR(CURRENT_DATE, 'MM');
  
  SELECT COALESCE(MAX(SUBSTRING(invoice_number FROM 'INV-\d{4}-\d{2}-(\d+)')::INTEGER), 0) + 1
  INTO sequence_num
  FROM platform_invoices
  WHERE invoice_number LIKE 'INV-' || year || '-' || month || '-%';
  
  RETURN 'INV-' || year || '-' || month || '-' || LPAD(sequence_num::TEXT, 4, '0');
END;
$function$;

-- Fix ensure_one_default_payment_provider function
CREATE OR REPLACE FUNCTION public.ensure_one_default_payment_provider()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE platform_payment_providers 
    SET is_default = false 
    WHERE id != NEW.id AND is_default = true;
  END IF;
  RETURN NEW;
END;
$function$;

-- Fix protect_system_locked_users function (already has search_path, verify it's correct)
CREATE OR REPLACE FUNCTION public.protect_system_locked_users()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Prevent deletion of system-locked users
  IF TG_OP = 'DELETE' THEN
    IF OLD.system_locked = TRUE THEN
      RAISE EXCEPTION 'Cannot delete system-locked user. This is a protected platform account.';
    END IF;
    RETURN OLD;
  END IF;

  -- Prevent unlocking or role changes for system-locked users
  IF TG_OP = 'UPDATE' THEN
    IF OLD.system_locked = TRUE THEN
      IF NEW.system_locked = FALSE THEN
        RAISE EXCEPTION 'Cannot remove system_locked flag from protected user';
      END IF;
      IF NEW.role != OLD.role THEN
        RAISE EXCEPTION 'Cannot change role of system-locked user';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Add suspension_reason to platform_tenants for tracking
ALTER TABLE platform_tenants 
ADD COLUMN IF NOT EXISTS suspension_reason TEXT;