-- Phase 1: Fix staff_role_check constraint to include all staff roles
ALTER TABLE staff DROP CONSTRAINT IF EXISTS staff_role_check;

ALTER TABLE staff ADD CONSTRAINT staff_role_check CHECK (
  role IN (
    -- Management & General
    'owner', 'general_manager', 'manager', 'supervisor',
    
    -- Front Office
    'receptionist', 'guest_service_agent', 'front_desk_supervisor', 'front_office_manager',
    
    -- Housekeeping
    'room_attendant', 'housekeeper', 'housekeeping_supervisor', 'housekeeping_manager',
    
    -- Maintenance
    'technician', 'electrician', 'plumber', 'maintenance_supervisor', 'maintenance_manager',
    
    -- Food & Beverage
    'waiter', 'server', 'restaurant_supervisor', 'fnb_manager',
    
    -- Kitchen
    'cook', 'chef', 'kitchen_assistant', 'sous_chef', 'executive_chef', 'kitchen_supervisor', 'kitchen_manager',
    
    -- Bar
    'bartender', 'bar_supervisor', 'bar_manager',
    
    -- Finance
    'cashier', 'accountant', 'finance_supervisor', 'finance_manager',
    
    -- Inventory
    'store_keeper', 'store_clerk', 'inventory_supervisor', 'inventory_manager', 'store_manager',
    
    -- HR
    'hr_officer', 'hr_admin', 'hr_assistant', 'hr_coordinator', 'hr_supervisor', 'hr_manager',
    
    -- Spa
    'therapist', 'spa_staff', 'spa_attendant', 'spa_supervisor', 'spa_manager',
    
    -- Concierge
    'concierge_agent', 'concierge_staff', 'bell_captain', 'concierge_supervisor', 'concierge_manager',
    
    -- Admin
    'admin_assistant', 'admin_officer', 'admin_coordinator', 'admin_supervisor', 'admin_manager',
    
    -- Security
    'security_staff', 'security_guard', 'security_supervisor', 'chief_security_officer',
    
    -- Legacy/App Roles (for compatibility)
    'frontdesk', 'housekeeping', 'maintenance', 'finance', 'restaurant', 'bar'
  )
);

-- Phase 2: Ensure app_role enum includes kitchen (separate from restaurant)
-- Note: Other roles (spa, concierge, admin, hr, etc.) were added in previous migration
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'kitchen' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE app_role ADD VALUE 'kitchen';
  END IF;
END $$;