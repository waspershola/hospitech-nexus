-- Create storage bucket for notification sounds if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('notification-sounds', 'notification-sounds', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist and recreate them
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Notification sounds are publicly accessible" ON storage.objects;
  DROP POLICY IF EXISTS "Owners/Managers can upload notification sounds" ON storage.objects;
  DROP POLICY IF EXISTS "Owners/Managers can update notification sounds" ON storage.objects;
  DROP POLICY IF EXISTS "Owners/Managers can delete notification sounds" ON storage.objects;
END $$;

-- Set up storage policies for notification sounds bucket
CREATE POLICY "Notification sounds are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'notification-sounds');

CREATE POLICY "Owners/Managers can upload notification sounds"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'notification-sounds' AND
  (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'manager')
  ))
);

CREATE POLICY "Owners/Managers can update notification sounds"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'notification-sounds' AND
  (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'manager')
  ))
);

CREATE POLICY "Owners/Managers can delete notification sounds"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'notification-sounds' AND
  (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'manager')
  ))
);

-- Add default notification sound entries for all tenants
-- Note: The system will use Web Audio API fallback if files don't exist
INSERT INTO notification_sounds (tenant_id, name, category, file_path, is_default)
SELECT 
  t.id as tenant_id,
  'Default QR Request Alert' as name,
  'qr_request' as category,
  'default-notification.mp3' as file_path,
  true as is_default
FROM tenants t
ON CONFLICT DO NOTHING;