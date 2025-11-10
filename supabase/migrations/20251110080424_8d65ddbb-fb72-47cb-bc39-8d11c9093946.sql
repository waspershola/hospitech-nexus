-- Migration 1: Fix Navigation Roles for Guest Requests
UPDATE platform_nav_items
SET roles_allowed = ARRAY['owner', 'manager', 'frontdesk', 'housekeeping', 'maintenance', 'restaurant', 'kitchen', 'bar', 'supervisor']
WHERE name = 'Guest Requests' OR path = '/dashboard/guest-requests';

-- Migration 2: Add QR Theme Settings to hotel_branding
ALTER TABLE hotel_branding
ADD COLUMN IF NOT EXISTS qr_theme text DEFAULT 'classic_luxury_gold',
ADD COLUMN IF NOT EXISTS qr_primary_color text,
ADD COLUMN IF NOT EXISTS qr_accent_color text;

-- Migration 3: Add QR Feature Toggles to hotel_meta
ALTER TABLE hotel_meta
ADD COLUMN IF NOT EXISTS qr_menu_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS qr_wifi_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS qr_feedback_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS qr_calling_enabled boolean DEFAULT true;

-- Migration 4: Create menu-images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('menu-images', 'menu-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for menu-images
CREATE POLICY "Authenticated users can upload menu images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'menu-images');

CREATE POLICY "Public can view menu images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'menu-images');

CREATE POLICY "Owners can delete their menu images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'menu-images');

-- Migration 5: Create notification_sounds table
CREATE TABLE IF NOT EXISTS notification_sounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  file_path text NOT NULL,
  is_default boolean DEFAULT false,
  category text DEFAULT 'qr_request',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE notification_sounds ENABLE ROW LEVEL SECURITY;

-- RLS policies for notification_sounds
CREATE POLICY "Users can view sounds for their tenant"
ON notification_sounds FOR SELECT
TO authenticated
USING (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY "Owners can manage sounds"
ON notification_sounds FOR ALL
TO authenticated
USING (
  tenant_id = get_user_tenant(auth.uid()) AND
  (has_role(auth.uid(), tenant_id, 'owner'::app_role) OR has_role(auth.uid(), tenant_id, 'manager'::app_role))
);

-- Seed default notification sounds (global defaults - will be copied per tenant on first use)
INSERT INTO notification_sounds (tenant_id, name, file_path, is_default, category)
SELECT 
  t.id,
  'Default Chime',
  '/sounds/notification-default.mp3',
  true,
  'qr_request'
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM notification_sounds ns WHERE ns.tenant_id = t.id AND ns.category = 'qr_request'
)
ON CONFLICT DO NOTHING;

INSERT INTO notification_sounds (tenant_id, name, file_path, is_default, category)
SELECT 
  t.id,
  'Urgent Alert',
  '/sounds/notification-alt.mp3',
  false,
  'qr_request'
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM notification_sounds ns WHERE ns.tenant_id = t.id AND ns.file_path = '/sounds/notification-alt.mp3'
)
ON CONFLICT DO NOTHING;