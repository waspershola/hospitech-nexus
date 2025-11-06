-- Set default quarterly prices for existing plans (approximately 3x monthly)
UPDATE platform_plans 
SET price_quarterly = ROUND(price_monthly * 2.8)
WHERE price_quarterly = 0 OR price_quarterly IS NULL;