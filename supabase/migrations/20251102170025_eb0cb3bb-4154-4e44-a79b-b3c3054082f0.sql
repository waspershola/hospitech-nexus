-- Fix Room 102 and 103 to point to kk's group booking
-- This resolves the issue where rooms show wrong guest information

-- Update Room 102: Point to kk's group booking instead of bala's
UPDATE rooms 
SET current_reservation_id = '42d3abdd-56e3-4104-8497-df0f30f39068',
    current_guest_id = (SELECT guest_id FROM bookings WHERE id = '42d3abdd-56e3-4104-8497-df0f30f39068')
WHERE number = '102';

-- Update Room 103: Point to kk's group booking instead of tt's
UPDATE rooms 
SET current_reservation_id = '09bb656a-b844-4666-aa32-2da70b8eeb40',
    current_guest_id = (SELECT guest_id FROM bookings WHERE id = '09bb656a-b844-4666-aa32-2da70b8eeb40')
WHERE number = '103';