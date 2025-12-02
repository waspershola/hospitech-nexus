-- ROOM-CATEGORY-COLOR-MARKERS-V1: Set distinct default colors per category type
UPDATE room_categories SET display_color = '#D4AF37' WHERE UPPER(name) LIKE '%LUXURY%';
UPDATE room_categories SET display_color = '#2563EB' WHERE UPPER(name) LIKE '%DELUXE%' AND UPPER(name) NOT LIKE '%SUITE%';
UPDATE room_categories SET display_color = '#7C3AED' WHERE UPPER(name) LIKE '%SUITE%';
UPDATE room_categories SET display_color = '#059669' WHERE UPPER(name) LIKE '%EXECUTIVE%';
UPDATE room_categories SET display_color = '#DC2626' WHERE UPPER(name) LIKE '%PRESIDENTIAL%';
UPDATE room_categories SET display_color = '#0D9488' WHERE UPPER(name) LIKE '%FAMILY%';
-- STANDARD remains gray (#6B7280) as default