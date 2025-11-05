-- Phase 1C: Seed Platform Data

-- Seed Platform Plans
INSERT INTO platform_plans (name, monthly_price, included_sms, trial_days, feature_flags)
VALUES 
  ('Free', 0, 100, 0, '{"max_rooms": 10, "max_staff": 3, "features": ["basic_booking", "basic_reporting"]}'),
  ('Starter', 2500, 500, 14, '{"max_rooms": 50, "max_staff": 10, "features": ["booking", "reporting", "sms_notifications", "wallet"]}'),
  ('Professional', 7500, 2000, 14, '{"max_rooms": 200, "max_staff": 50, "features": ["booking", "advanced_reporting", "sms_notifications", "wallet", "finance_center", "inventory"]}'),
  ('Enterprise', 25000, 10000, 30, '{"max_rooms": -1, "max_staff": -1, "features": ["all"]}'::jsonb)
ON CONFLICT DO NOTHING;

-- Seed Platform Add-ons (SMS Bundles)
INSERT INTO platform_addons (key, title, description, pricing, units_available)
VALUES 
  ('sms_bundle_100', '100 SMS Credits', 'Add 100 SMS credits to your account', '{"amount": 500, "currency": "NGN"}'::jsonb, 100),
  ('sms_bundle_500', '500 SMS Credits', 'Add 500 SMS credits to your account', '{"amount": 2000, "currency": "NGN"}'::jsonb, 500),
  ('sms_bundle_1000', '1,000 SMS Credits', 'Add 1,000 SMS credits to your account', '{"amount": 3500, "currency": "NGN"}'::jsonb, 1000),
  ('sms_bundle_5000', '5,000 SMS Credits', 'Add 5,000 SMS credits to your account (Best Value)', '{"amount": 15000, "currency": "NGN"}'::jsonb, 5000),
  ('sms_bundle_10000', '10,000 SMS Credits', 'Add 10,000 SMS credits to your account (Enterprise)', '{"amount": 28000, "currency": "NGN"}'::jsonb, 10000)
ON CONFLICT (key) DO NOTHING;

-- Seed Global SMS Templates (tenant_id IS NULL means global)
INSERT INTO platform_sms_templates (tenant_id, event_key, language, template_body, is_active)
VALUES 
  (NULL, 'booking_confirmed', 'en', 'Hi {{guest_name}}, your booking at {{hotel_name}} is confirmed! Check-in: {{check_in_date}}, Room: {{room_number}}. Ref: {{booking_ref}}', true),
  (NULL, 'check_in', 'en', 'Welcome to {{hotel_name}}, {{guest_name}}! You are checked into Room {{room_number}}. Enjoy your stay! Need assistance? Call front desk.', true),
  (NULL, 'checkout_reminder', 'en', 'Hi {{guest_name}}, this is a reminder that your checkout is scheduled for {{checkout_date}} at {{checkout_time}}. Thank you for staying with us!', true),
  (NULL, 'payment_received', 'en', 'Payment of {{amount}} received for {{description}}. Receipt: {{receipt_number}}. Thank you! - {{hotel_name}}', true),
  (NULL, 'service_request_received', 'en', 'Hi {{guest_name}}, we received your {{service_type}} request. Our team will assist you shortly. - {{hotel_name}}', true),
  (NULL, 'service_request_completed', 'en', 'Hi {{guest_name}}, your {{service_type}} request has been completed. Thank you! - {{hotel_name}}', true)
ON CONFLICT (tenant_id, event_key, language) DO NOTHING;

-- Seed Default Platform Navigation Items (tenant_id IS NULL means global defaults)
INSERT INTO platform_nav_items (tenant_id, name, path, icon, roles_allowed, departments_allowed, order_index, is_active)
VALUES 
  (NULL, 'Overview', '/dashboard/overview', 'LayoutDashboard', ARRAY['owner', 'manager', 'frontdesk', 'finance', 'accountant'], ARRAY[]::TEXT[], 1, true),
  (NULL, 'Front Desk', '/dashboard/front-desk', 'Hotel', ARRAY['owner', 'manager', 'frontdesk'], ARRAY['front_office', 'management'], 2, true),
  (NULL, 'Bookings', '/dashboard/bookings', 'CalendarDays', ARRAY['owner', 'manager', 'frontdesk'], ARRAY['front_office', 'management'], 3, true),
  (NULL, 'Guests', '/dashboard/guests', 'Users', ARRAY['owner', 'manager', 'frontdesk'], ARRAY['front_office', 'management'], 4, true),
  (NULL, 'Rooms', '/dashboard/rooms', 'BedDouble', ARRAY['owner', 'manager', 'frontdesk', 'housekeeping'], ARRAY['front_office', 'housekeeping', 'management'], 5, true),
  (NULL, 'Finance Center', '/dashboard/finance-center', 'DollarSign', ARRAY['owner', 'manager', 'finance', 'accountant'], ARRAY['finance', 'management'], 6, true),
  (NULL, 'Payments', '/dashboard/payments', 'CreditCard', ARRAY['owner', 'manager', 'frontdesk', 'finance'], ARRAY['front_office', 'finance', 'management'], 7, true),
  (NULL, 'Wallets', '/dashboard/wallets', 'Wallet', ARRAY['owner', 'manager', 'finance'], ARRAY['finance', 'management'], 8, true),
  (NULL, 'Inventory', '/dashboard/inventory', 'Package', ARRAY['owner', 'manager', 'store_manager', 'procurement'], ARRAY['inventory', 'management'], 9, true),
  (NULL, 'Staff', '/dashboard/staff', 'UserCog', ARRAY['owner', 'manager'], ARRAY['management'], 10, true),
  (NULL, 'Reports', '/dashboard/reports', 'FileText', ARRAY['owner', 'manager', 'finance', 'accountant'], ARRAY['management', 'finance'], 11, true),
  (NULL, 'Configuration', '/dashboard/configuration-center', 'Settings', ARRAY['owner', 'manager'], ARRAY['management'], 12, true)
ON CONFLICT DO NOTHING;