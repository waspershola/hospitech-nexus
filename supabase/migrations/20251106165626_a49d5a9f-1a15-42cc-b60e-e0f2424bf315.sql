-- Add addon_type and metadata columns to platform_addons
ALTER TABLE platform_addons
ADD COLUMN addon_type TEXT NOT NULL DEFAULT 'sms_credits',
ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN platform_addons.addon_type IS 'Type of addon: sms_credits, integration, service, customization';
COMMENT ON COLUMN platform_addons.metadata IS 'Type-specific data stored as JSON';

-- Create index for faster filtering by type
CREATE INDEX idx_platform_addons_addon_type ON platform_addons(addon_type);

-- Insert non-SMS addons
INSERT INTO platform_addons (key, title, description, addon_type, pricing, units_available, metadata)
VALUES
  ('service_custom_website', 'Custom Website Design', 'Professional website design and development tailored to your hotel brand', 'service', '{"amount": 150000, "currency": "NGN"}'::jsonb, NULL, '{"delivery_time": "2-3 weeks", "includes": ["responsive design", "brand customization", "mobile optimization"]}'::jsonb),
  ('integration_booking_com', 'Booking.com Integration', 'Direct integration with Booking.com channel for seamless reservations', 'integration', '{"amount": 50000, "currency": "NGN"}'::jsonb, NULL, '{"setup_time": "1-2 days", "features": ["real-time sync", "inventory management", "rate updates"]}'::jsonb),
  ('integration_expedia', 'Expedia Integration', 'Direct integration with Expedia channel for expanded reach', 'integration', '{"amount": 50000, "currency": "NGN"}'::jsonb, NULL, '{"setup_time": "1-2 days", "features": ["real-time sync", "inventory management", "rate updates"]}'::jsonb),
  ('integration_agoda', 'Agoda Integration', 'Direct integration with Agoda channel for Asian market reach', 'integration', '{"amount": 50000, "currency": "NGN"}'::jsonb, NULL, '{"setup_time": "1-2 days", "features": ["real-time sync", "inventory management", "rate updates"]}'::jsonb),
  ('integration_whatsapp', 'WhatsApp Business Integration', 'Automated guest communication via WhatsApp Business API', 'integration', '{"amount": 30000, "currency": "NGN"}'::jsonb, NULL, '{"setup_time": "1 day", "features": ["automated messages", "booking confirmations", "guest support"]}'::jsonb),
  ('service_email_marketing', 'Email Marketing Package', 'Professional email marketing campaigns and guest engagement', 'service', '{"amount": 25000, "currency": "NGN"}'::jsonb, NULL, '{"includes": ["campaign design", "guest segmentation", "monthly reports"]}'::jsonb),
  ('service_analytics', 'Advanced Analytics Dashboard', 'Comprehensive analytics and business intelligence dashboard', 'service', '{"amount": 40000, "currency": "NGN"}'::jsonb, NULL, '{"features": ["revenue analytics", "occupancy reports", "guest insights", "forecasting"]}'::jsonb);