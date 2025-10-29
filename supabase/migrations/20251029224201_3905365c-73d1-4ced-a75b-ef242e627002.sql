-- Initialize default configuration records for existing tenants
-- This ensures all tenants have baseline settings

-- Insert default hotel_financials for tenants that don't have them
INSERT INTO public.hotel_financials (
  tenant_id,
  vat_rate,
  vat_inclusive,
  service_charge,
  service_charge_inclusive,
  currency,
  currency_symbol,
  symbol_position,
  decimal_separator,
  thousand_separator,
  decimal_places
)
SELECT 
  t.id,
  0,
  false,
  0,
  false,
  'NGN',
  '₦',
  'before',
  '.',
  ',',
  2
FROM public.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM public.hotel_financials hf WHERE hf.tenant_id = t.id
);

-- Insert default hotel_branding for tenants that don't have them
INSERT INTO public.hotel_branding (
  tenant_id,
  primary_color,
  secondary_color,
  accent_color,
  font_heading,
  font_body
)
SELECT 
  t.id,
  'hsl(0 65% 51%)',
  'hsl(51 100% 50%)',
  'hsl(51 85% 65%)',
  'Playfair Display',
  'Inter'
FROM public.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM public.hotel_branding hb WHERE hb.tenant_id = t.id
);

-- Insert default email_settings for tenants that don't have them
INSERT INTO public.email_settings (
  tenant_id,
  from_name,
  from_email,
  smtp_enabled,
  email_branding_enabled
)
SELECT 
  t.id,
  'Hotel',
  'noreply@hotel.com',
  false,
  true
FROM public.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM public.email_settings es WHERE es.tenant_id = t.id
);

-- Insert default hotel_meta for tenants that don't have them
INSERT INTO public.hotel_meta (
  tenant_id,
  hotel_name,
  tagline
)
SELECT 
  t.id,
  t.name,
  'Welcome to ' || t.name
FROM public.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM public.hotel_meta hm WHERE hm.tenant_id = t.id
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_hotel_configurations_tenant ON public.hotel_configurations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hotel_financials_tenant ON public.hotel_financials(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hotel_branding_tenant ON public.hotel_branding(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_settings_tenant ON public.email_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hotel_meta_tenant ON public.hotel_meta(tenant_id);
CREATE INDEX IF NOT EXISTS idx_document_templates_tenant ON public.document_templates(tenant_id);

-- Update the handle_new_user_signup function to create default configs for new tenants
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    
    -- Create default financial settings
    INSERT INTO public.hotel_financials (
      tenant_id, vat_rate, vat_inclusive, service_charge, 
      service_charge_inclusive, currency, currency_symbol, 
      symbol_position, decimal_separator, thousand_separator, decimal_places
    ) VALUES (
      new_tenant_id, 0, false, 0, false, 'NGN', '₦', 'before', '.', ',', 2
    );
    
    -- Create default branding
    INSERT INTO public.hotel_branding (
      tenant_id, primary_color, secondary_color, accent_color,
      font_heading, font_body
    ) VALUES (
      new_tenant_id, 'hsl(0 65% 51%)', 'hsl(51 100% 50%)', 'hsl(51 85% 65%)',
      'Playfair Display', 'Inter'
    );
    
    -- Create default email settings
    INSERT INTO public.email_settings (
      tenant_id, from_name, from_email, smtp_enabled, email_branding_enabled
    ) VALUES (
      new_tenant_id, hotel_name_value, 'noreply@hotel.com', false, true
    );
    
    -- Create default hotel meta
    INSERT INTO public.hotel_meta (
      tenant_id, hotel_name, tagline
    ) VALUES (
      new_tenant_id, hotel_name_value, 'Welcome to ' || hotel_name_value
    );
  END IF;
  
  RETURN NEW;
END;
$function$;