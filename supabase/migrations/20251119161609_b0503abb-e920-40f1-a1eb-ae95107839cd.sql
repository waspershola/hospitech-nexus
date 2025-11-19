-- Migration: Phase 5C - Helper RPC for Frontend Credit Availability Display
-- Version: CREDIT-LIMIT-ENFORCEMENT-V1.1
-- Description: Creates calculate_org_remaining_limit RPC for real-time credit display

CREATE OR REPLACE FUNCTION calculate_org_remaining_limit(
  p_org_id uuid,
  p_guest_id uuid,
  p_department text,
  p_amount numeric
) RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org organizations;
  v_wallet wallets;
  v_total_credit_used numeric := 0;
  v_guest_usage numeric := 0;
  v_department_usage numeric := 0;
  v_rule RECORD;
  v_guest_limit numeric := NULL;
  v_guest_period text := NULL;
  v_dept_limit numeric := NULL;
  v_dept_period text := NULL;
  v_result jsonb;
BEGIN
  -- Get organization details
  SELECT * INTO v_org
  FROM organizations
  WHERE id = p_org_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Organization not found'
    );
  END IF;
  
  -- Get wallet balance if exists
  IF v_org.wallet_id IS NOT NULL THEN
    SELECT * INTO v_wallet
    FROM wallets
    WHERE id = v_org.wallet_id;
    
    v_total_credit_used := ABS(LEAST(v_wallet.balance, 0));
  END IF;
  
  -- Calculate remaining total credit
  DECLARE
    v_total_limit numeric := COALESCE(v_org.credit_limit, 0);
    v_remaining_total numeric := v_total_limit - v_total_credit_used;
  BEGIN
    -- Get per-guest and per-department limits from rules
    FOR v_rule IN 
      SELECT * FROM organization_wallet_rules 
      WHERE organization_id = p_org_id 
        AND active = true
    LOOP
      IF v_rule.rule_type = 'per_guest' THEN
        -- Calculate guest usage
        SELECT COALESCE(SUM(wt.amount), 0) INTO v_guest_usage
        FROM wallet_transactions wt
        JOIN wallets w ON wt.wallet_id = w.id
        WHERE w.owner_id = p_org_id
          AND wt.type = 'debit'
          AND COALESCE(wt.metadata->>'guest_id', '') = p_guest_id::text
          AND wt.created_at >= CASE 
            WHEN v_rule.period = 'daily' THEN now() - interval '1 day'
            WHEN v_rule.period = 'weekly' THEN now() - interval '7 days'
            WHEN v_rule.period = 'monthly' THEN now() - interval '30 days'
            ELSE now() - interval '100 years'
          END;
        
        v_guest_limit := v_rule.limit_amount;
        v_guest_period := v_rule.period;
        
      ELSIF v_rule.rule_type = 'per_department' AND v_rule.entity_ref = p_department THEN
        -- Calculate department usage
        SELECT COALESCE(SUM(wt.amount), 0) INTO v_department_usage
        FROM wallet_transactions wt
        JOIN wallets w ON wt.wallet_id = w.id
        WHERE w.owner_id = p_org_id
          AND wt.type = 'debit'
          AND wt.department = p_department
          AND wt.created_at >= CASE 
            WHEN v_rule.period = 'daily' THEN now() - interval '1 day'
            WHEN v_rule.period = 'weekly' THEN now() - interval '7 days'
            WHEN v_rule.period = 'monthly' THEN now() - interval '30 days'
            ELSE now() - interval '100 years'
          END;
        
        v_dept_limit := v_rule.limit_amount;
        v_dept_period := v_rule.period;
      END IF;
    END LOOP;
    
    -- Build result
    v_result := jsonb_build_object(
      'success', true,
      'total_credit_limit', v_total_limit,
      'total_credit_used', v_total_credit_used,
      'total_credit_remaining', v_remaining_total,
      'wallet_balance', COALESCE(v_wallet.balance, 0),
      'allow_negative_balance', COALESCE(v_org.allow_negative_balance, false),
      'guest_limit', v_guest_limit,
      'guest_used', v_guest_usage,
      'guest_remaining', CASE WHEN v_guest_limit IS NOT NULL THEN v_guest_limit - v_guest_usage ELSE NULL END,
      'guest_period', v_guest_period,
      'department_limit', v_dept_limit,
      'department_used', v_department_usage,
      'department_remaining', CASE WHEN v_dept_limit IS NOT NULL THEN v_dept_limit - v_department_usage ELSE NULL END,
      'department_period', v_dept_period,
      'proposed_amount', p_amount,
      'will_exceed', (
        (v_remaining_total < p_amount AND NOT COALESCE(v_org.allow_negative_balance, false)) OR
        (v_guest_limit IS NOT NULL AND v_guest_usage + p_amount > v_guest_limit) OR
        (v_dept_limit IS NOT NULL AND v_department_usage + p_amount > v_dept_limit)
      )
    );
    
    RETURN v_result;
  END;
END;
$$;