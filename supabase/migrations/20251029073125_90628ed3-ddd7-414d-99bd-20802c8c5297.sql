-- Add 'overstay' status to room status check constraint
-- First, we need to drop the existing constraint if it exists
ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_status_check;

-- Add the new constraint with 'overstay' included
ALTER TABLE rooms ADD CONSTRAINT rooms_status_check 
CHECK (status IN ('available', 'occupied', 'reserved', 'cleaning', 'maintenance', 'overstay'));