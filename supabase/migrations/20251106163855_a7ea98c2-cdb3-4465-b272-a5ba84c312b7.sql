-- Add quarterly pricing to platform plans
ALTER TABLE platform_plans 
ADD COLUMN IF NOT EXISTS price_quarterly numeric DEFAULT 0;