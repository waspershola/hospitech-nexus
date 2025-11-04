-- Add default check-in and check-out time configuration for all tenants
INSERT INTO hotel_configurations (tenant_id, key, value)
SELECT 
  id as tenant_id,
  'check_in_time',
  '"14:00"'::jsonb
FROM tenants
WHERE NOT EXISTS (
  SELECT 1 FROM hotel_configurations 
  WHERE hotel_configurations.tenant_id = tenants.id 
  AND key = 'check_in_time'
);

INSERT INTO hotel_configurations (tenant_id, key, value)
SELECT 
  id as tenant_id,
  'check_out_time',
  '"12:00"'::jsonb
FROM tenants
WHERE NOT EXISTS (
  SELECT 1 FROM hotel_configurations 
  WHERE hotel_configurations.tenant_id = tenants.id 
  AND key = 'check_out_time'
);