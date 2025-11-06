INSERT INTO platform_navigation_items (label, path, icon, order_index, allowed_roles, is_active)
VALUES 
  ('Usage Monitoring', '/dashboard/platform-usage', 'Activity', 60, ARRAY['super_admin'], true),
  ('Invoice Management', '/dashboard/platform-invoices', 'FileText', 61, ARRAY['super_admin'], true),
  ('Payment Enforcement', '/dashboard/platform-enforcement', 'AlertTriangle', 62, ARRAY['super_admin'], true),
  ('Platform Analytics', '/dashboard/platform-analytics', 'BarChart3', 63, ARRAY['super_admin'], true),
  ('Tenant Health', '/dashboard/platform-health', 'Activity', 64, ARRAY['super_admin'], true);