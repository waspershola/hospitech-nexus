-- Fix update_wallet_balance function to set search_path
CREATE OR REPLACE FUNCTION public.update_wallet_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.type = 'credit' THEN
    UPDATE wallets 
    SET balance = balance + NEW.amount,
        last_transaction_at = NEW.created_at,
        updated_at = now()
    WHERE id = NEW.wallet_id;
  ELSIF NEW.type = 'debit' THEN
    UPDATE wallets 
    SET balance = balance - NEW.amount,
        last_transaction_at = NEW.created_at,
        updated_at = now()
    WHERE id = NEW.wallet_id;
  END IF;
  
  RETURN NEW;
END;
$function$;