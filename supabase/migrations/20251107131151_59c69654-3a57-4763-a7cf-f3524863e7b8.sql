-- Add new SMS event toggles to tenant_sms_settings
ALTER TABLE tenant_sms_settings 
ADD COLUMN IF NOT EXISTS auto_send_checkout_confirmation BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_send_payment_confirmation BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_send_cancellation BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_send_modification BOOLEAN DEFAULT false;

COMMENT ON COLUMN tenant_sms_settings.auto_send_checkout_confirmation IS 'Automatically send SMS when guest checks out';
COMMENT ON COLUMN tenant_sms_settings.auto_send_payment_confirmation IS 'Automatically send SMS when payment is received';
COMMENT ON COLUMN tenant_sms_settings.auto_send_cancellation IS 'Automatically send SMS when booking is cancelled';
COMMENT ON COLUMN tenant_sms_settings.auto_send_modification IS 'Automatically send SMS when booking is modified';