-- Phase 15: Fix service_category for menu orders
-- Update all existing menu orders from 'menu_order' to 'digital_menu'
UPDATE requests 
SET service_category = 'digital_menu' 
WHERE service_category = 'menu_order' 
  AND qr_token IS NOT NULL;