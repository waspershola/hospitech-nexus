-- Move AI Concierge under Administration parent
-- NAVIGATION-AI-CONCIERGE-V2: Update parent_id to place under Administration

UPDATE platform_nav_items 
SET parent_id = 'adc4b353-007c-448a-855b-3fff7adfaa22'
WHERE path = '/dashboard/ai-concierge';