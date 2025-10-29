-- Task 1.1: Guest Wallet Auto-Creation
-- Create function to auto-create guest wallet
CREATE OR REPLACE FUNCTION public.create_guest_wallet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.wallets (
    tenant_id,
    wallet_type,
    owner_id,
    name,
    currency,
    balance
  )
  VALUES (
    NEW.tenant_id,
    'guest',
    NEW.id,
    NEW.name || '''s Wallet',
    'NGN',
    0
  )
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger on guests table
DROP TRIGGER IF EXISTS trigger_create_guest_wallet ON public.guests;
CREATE TRIGGER trigger_create_guest_wallet
  AFTER INSERT ON public.guests
  FOR EACH ROW
  EXECUTE FUNCTION public.create_guest_wallet();

-- Task 1.4: Checkout Payment Enforcement Config
-- Add allow_checkout_without_payment to hotel_configurations
-- This will be stored as a JSON value in the existing hotel_configurations table
-- No schema change needed - using existing key-value structure