-- DATA-FIX-SAMEDAY-V1: Correct same-day bookings to proper 1-night stays (Dec 2 → Dec 3)
-- This fixes 5 bookings that were mistakenly created with check_in = check_out (same day)
-- Converting them to proper 1-night stays by extending check_out to Dec 3

UPDATE bookings 
SET check_out = '2025-12-03 12:00:00+00'
WHERE id IN (
  '8e3657ec-c830-4a30-aa60-4b4e0ee05b29',  -- Room 102
  'ffbc7fcc-5191-434b-b5ac-72ef7f24af7a',  -- Room 348
  '451f6482-1c00-43f1-82e2-8d9b56ffacc4',  -- Room 349
  '4edcec4b-18c6-4a7f-a41a-bac1697fd694',  -- Room 350
  '18716aa1-ac1f-4070-ae8f-328901dbc59e'   -- ROOM ZAKARI
);