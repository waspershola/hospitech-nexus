-- Consolidate type and service_category columns in requests table
-- This migration ensures all requests use the 'type' column consistently

-- Step 1: Copy any data from service_category to type where type might be missing
UPDATE requests 
SET type = service_category 
WHERE type IS NULL AND service_category IS NOT NULL;

-- Step 2: Copy any data from type to service_category for backward compatibility
UPDATE requests 
SET service_category = type 
WHERE service_category IS NULL AND type IS NOT NULL;

-- Step 3: Drop the redundant service_category column
ALTER TABLE requests DROP COLUMN IF EXISTS service_category;

-- Note: The 'type' column is the canonical field going forward
-- All application code now references 'type' instead of 'service_category'