-- ROOM-CATEGORY-COLOR-MARKERS-V1: Add display_color column to room_categories
ALTER TABLE room_categories 
ADD COLUMN IF NOT EXISTS display_color TEXT DEFAULT '#6B7280';

COMMENT ON COLUMN room_categories.display_color IS 
  'Hex color for visual category markers on room tiles';