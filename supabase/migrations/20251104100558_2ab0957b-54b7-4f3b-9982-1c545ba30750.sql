-- Add Inventory navigation for owner and manager roles
INSERT INTO navigation_items (tenant_id, name, path, icon, allowed_roles, order_index, is_active)
VALUES
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Inventory', '/dashboard/inventory', 'Package', ARRAY['owner'::app_role, 'manager'::app_role], 14, true)
ON CONFLICT DO NOTHING;