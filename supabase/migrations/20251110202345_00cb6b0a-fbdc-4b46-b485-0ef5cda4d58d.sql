-- Add menu_type field to menu_items table for distinguishing restaurant vs room service
ALTER TABLE menu_items 
ADD COLUMN IF NOT EXISTS menu_type TEXT DEFAULT 'restaurant';

-- Add comment for documentation
COMMENT ON COLUMN menu_items.menu_type IS 'Type of menu: restaurant, room_service, bar, breakfast';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_menu_items_menu_type ON menu_items(menu_type);

-- Update existing approved items to have default menu_type
UPDATE menu_items 
SET menu_type = 'restaurant' 
WHERE menu_type IS NULL;