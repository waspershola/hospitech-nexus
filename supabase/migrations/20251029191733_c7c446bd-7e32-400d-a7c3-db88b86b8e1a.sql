-- Phase 1: Fix validate_org_limits() function logic
CREATE OR REPLACE FUNCTION public.validate_org_limits(_org_id uuid, _guest_id uuid, _department text, _amount numeric)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  rule_record RECORD;
  current_usage numeric;
  result jsonb;
BEGIN
  result := jsonb_build_object('allowed', true);
  
  FOR rule_record IN 
    SELECT * FROM organization_wallet_rules 
    WHERE organization_id = _org_id 
      AND active = true
  LOOP
    -- Per-guest limit applies to EACH guest
    IF rule_record.rule_type = 'per_guest' THEN
      SELECT COALESCE(SUM(wt.amount), 0) INTO current_usage
      FROM wallet_transactions wt
      JOIN wallets w ON wt.wallet_id = w.id
      WHERE w.owner_id = _org_id
        AND wt.type = 'debit'
        AND COALESCE(wt.metadata->>'guest_id', '') = _guest_id::text
        AND wt.created_at >= CASE 
          WHEN rule_record.period = 'daily' THEN now() - interval '1 day'
          WHEN rule_record.period = 'weekly' THEN now() - interval '7 days'
          WHEN rule_record.period = 'monthly' THEN now() - interval '30 days'
          ELSE now() - interval '100 years'
        END;
      
      IF current_usage + _amount > rule_record.limit_amount THEN
        result := jsonb_build_object(
          'allowed', false,
          'code', 'GUEST_LIMIT_EXCEEDED',
          'detail', format('Guest has spent ₦%s of ₦%s %s limit. This booking (₦%s) would exceed the limit.',
                          current_usage, rule_record.limit_amount, rule_record.period, _amount)
        );
        RETURN result;
      END IF;
      
    -- Per-department limit applies to specific department
    ELSIF rule_record.rule_type = 'per_department' AND rule_record.entity_ref = _department THEN
      SELECT COALESCE(SUM(wt.amount), 0) INTO current_usage
      FROM wallet_transactions wt
      JOIN wallets w ON wt.wallet_id = w.id
      WHERE w.owner_id = _org_id
        AND wt.type = 'debit'
        AND wt.department = _department
        AND wt.created_at >= CASE 
          WHEN rule_record.period = 'daily' THEN now() - interval '1 day'
          WHEN rule_record.period = 'weekly' THEN now() - interval '7 days'
          WHEN rule_record.period = 'monthly' THEN now() - interval '30 days'
          ELSE now() - interval '100 years'
        END;
      
      IF current_usage + _amount > rule_record.limit_amount THEN
        result := jsonb_build_object(
          'allowed', false,
          'code', 'DEPARTMENT_LIMIT_EXCEEDED',
          'detail', format('Department "%s" has spent ₦%s of ₦%s %s limit. This booking (₦%s) would exceed the limit.',
                          _department, current_usage, rule_record.limit_amount, rule_record.period, _amount)
        );
        RETURN result;
      END IF;
    END IF;
  END LOOP;
  
  RETURN result;
END;
$function$;

-- Phase 2: Add metadata tracking columns to wallet_transactions
ALTER TABLE wallet_transactions 
ADD COLUMN IF NOT EXISTS department text,
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Phase 5: Data migration - clean up existing rules
-- Per-guest rules should have NULL entity_ref (applies to all guests)
UPDATE organization_wallet_rules
SET entity_ref = NULL
WHERE rule_type = 'per_guest';

-- Per-department rules should have department name in entity_ref
UPDATE organization_wallet_rules
SET entity_ref = 'front_desk'
WHERE rule_type = 'per_department' 
  AND (entity_ref IS NULL OR entity_ref = '');