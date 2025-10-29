-- Fix 1: Restrict profiles table to prevent email harvesting
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Users can only view their own profile
CREATE POLICY "Users view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Staff can view profiles within their tenant for guest management
CREATE POLICY "Staff view tenant profiles" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM user_roles ur 
    WHERE ur.user_id = auth.uid() 
      AND ur.tenant_id IN (
        SELECT ur2.tenant_id 
        FROM user_roles ur2 
        WHERE ur2.user_id = profiles.id
      )
  )
);

-- Fix 2: Restrict email_settings to owners/managers only
DROP POLICY IF EXISTS "Users can view their tenant email settings" ON public.email_settings;

CREATE POLICY "Only owners/managers view email settings" 
ON public.email_settings 
FOR SELECT 
USING (
  (tenant_id = get_user_tenant(auth.uid())) 
  AND 
  (has_role(auth.uid(), tenant_id, 'owner'::app_role) OR has_role(auth.uid(), tenant_id, 'manager'::app_role))
);

-- Fix 3: Restrict finance_providers to owners/managers for viewing credentials
DROP POLICY IF EXISTS "providers_select" ON public.finance_providers;

CREATE POLICY "providers_select_restricted" 
ON public.finance_providers 
FOR SELECT 
USING (
  (tenant_id = get_user_tenant(auth.uid())) 
  AND 
  (has_role(auth.uid(), tenant_id, 'owner'::app_role) OR has_role(auth.uid(), tenant_id, 'manager'::app_role))
);