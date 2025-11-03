-- Add inventory and hr departments to the department_type enum
ALTER TYPE department_type ADD VALUE IF NOT EXISTS 'inventory';
ALTER TYPE department_type ADD VALUE IF NOT EXISTS 'hr';