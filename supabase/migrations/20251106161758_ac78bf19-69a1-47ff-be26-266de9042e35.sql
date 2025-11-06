-- Insert navigation items into correct table (platform_nav_items)
-- Using simple INSERT since there's no unique constraint on path
INSERT INTO platform_nav_items (name, path, icon, roles_allowed, departments_allowed, order_index, is_active, tenant_id)
VALUES
  ('Usage Monitoring', '/dashboard/platform-usage', 'Activity', ARRAY['super_admin']::text[], ARRAY[]::text[], 300, true, NULL),
  ('Invoice Management', '/dashboard/platform-invoices', 'FileText', ARRAY['super_admin']::text[], ARRAY[]::text[], 310, true, NULL),
  ('Payment Enforcement', '/dashboard/platform-enforcement', 'AlertTriangle', ARRAY['super_admin']::text[], ARRAY[]::text[], 320, true, NULL),
  ('Platform Analytics', '/dashboard/platform-analytics', 'BarChart3', ARRAY['super_admin']::text[], ARRAY[]::text[], 330, true, NULL),
  ('Tenant Health', '/dashboard/platform-health', 'Heart', ARRAY['super_admin']::text[], ARRAY[]::text[], 340, true, NULL);