-- Clean up duplicate navigation items and fix paths
-- First, delete all QR-related and Guest Requests navigation duplicates
DELETE FROM platform_nav_items 
WHERE name IN ('QR Portal', 'QR Analytics', 'QR Printables', 'Guest Requests');

-- Re-insert with correct paths (all must start with /dashboard/)
INSERT INTO platform_nav_items (name, path, icon, roles_allowed)
VALUES
  ('QR Management', '/dashboard/qr-management', 'QrCode', ARRAY['owner', 'manager']),
  ('Guest Requests', '/dashboard/guest-requests', 'MessageSquare', ARRAY['owner', 'manager', 'frontdesk', 'housekeeping', 'maintenance', 'kitchen', 'bar']),
  ('QR Analytics', '/dashboard/qr-analytics', 'BarChart3', ARRAY['owner', 'manager']),
  ('QR Printables', '/dashboard/qr-printables', 'FileText', ARRAY['owner', 'manager'])
ON CONFLICT DO NOTHING;