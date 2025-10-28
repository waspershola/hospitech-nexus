-- Allow users to create their own tenant during signup
CREATE POLICY "Users can create their own tenant during signup"
ON public.tenants
FOR INSERT
TO authenticated
WITH CHECK (
  NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()
  )
);

-- Allow users to assign themselves as owner during signup
CREATE POLICY "Users can assign themselves as owner"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() 
  AND role = 'owner'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur2 WHERE ur2.user_id = auth.uid()
  )
);