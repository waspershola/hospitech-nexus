-- Phase 1: Fix kitchen staff role assignment
UPDATE user_roles
SET role = 'kitchen'
WHERE user_id = '0ecbcc4d-6eb2-427c-97d2-f5abdff79bd7'
  AND role = 'restaurant';

-- Phase 4: Add navigation items for kitchen role
INSERT INTO navigation_items (tenant_id, name, path, icon, allowed_roles, order_index, is_active)
VALUES
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Overview', '/dashboard', 'Home', ARRAY['kitchen'::app_role], 1, true),
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Kitchen', '/dashboard/kitchen-dashboard', 'UtensilsCrossed', ARRAY['kitchen'::app_role], 2, true),
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Stock Requests', '/dashboard/inventory', 'Package', ARRAY['kitchen'::app_role], 3, true),
  ('2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec', 'Payments', '/dashboard/payments', 'CreditCard', ARRAY['kitchen'::app_role], 4, true)
ON CONFLICT DO NOTHING;