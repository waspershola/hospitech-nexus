-- Drop the RLS policies that don't work during signup (auth.uid() is null)
DROP POLICY IF EXISTS "Users can create their own tenant during signup" ON public.tenants;
DROP POLICY IF EXISTS "Users can assign themselves as owner" ON public.user_roles;

-- Create function to handle new user signup (runs with elevated privileges)
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_tenant_id uuid;
  hotel_name_value text;
BEGIN
  -- Get hotel name from user metadata
  hotel_name_value := NEW.raw_user_meta_data->>'hotel_name';
  
  -- Only proceed if hotel_name is provided (indicates owner signup)
  IF hotel_name_value IS NOT NULL THEN
    -- Create tenant
    INSERT INTO public.tenants (name, slug)
    VALUES (
      hotel_name_value,
      lower(regexp_replace(hotel_name_value, '[^a-zA-Z0-9]+', '-', 'g'))
    )
    RETURNING id INTO new_tenant_id;
    
    -- Assign owner role
    INSERT INTO public.user_roles (user_id, tenant_id, role)
    VALUES (NEW.id, new_tenant_id, 'owner');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically handle new user signups
DROP TRIGGER IF EXISTS on_auth_user_created_signup ON auth.users;
CREATE TRIGGER on_auth_user_created_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_signup();