-- Fix get_user_tenant function to set search_path
CREATE OR REPLACE FUNCTION public.get_user_tenant(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.user_roles WHERE user_id = _user_id LIMIT 1;
$$;

-- Fix get_tenant_by_domain function to set search_path
CREATE OR REPLACE FUNCTION public.get_tenant_by_domain(_domain text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id 
  FROM hotel_domains 
  WHERE domain = _domain 
    AND status = 'verified'
  LIMIT 1;
$$;