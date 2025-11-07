-- Phase 1: Database Schema Updates for Unified Platform & Tenant User Management

-- 1. Update platform_users table
ALTER TABLE public.platform_users 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS password_delivery_method TEXT DEFAULT 'email',
ADD COLUMN IF NOT EXISTS temp_password_expires_at TIMESTAMPTZ;

-- Add check constraint for password_delivery_method
ALTER TABLE public.platform_users
ADD CONSTRAINT platform_users_delivery_method_check 
CHECK (password_delivery_method IN ('email', 'sms', 'manual'));

-- 2. Update profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone TEXT;

-- 3. Create password delivery history table (audit trail)
CREATE TABLE IF NOT EXISTS public.password_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  delivery_method TEXT NOT NULL,
  delivered_by UUID REFERENCES auth.users(id),
  delivered_at TIMESTAMPTZ DEFAULT now(),
  delivery_status TEXT DEFAULT 'pending',
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Add check constraint for delivery_method
ALTER TABLE public.password_delivery_log
ADD CONSTRAINT password_delivery_log_method_check 
CHECK (delivery_method IN ('email', 'sms', 'manual'));

-- Add check constraint for delivery_status
ALTER TABLE public.password_delivery_log
ADD CONSTRAINT password_delivery_log_status_check 
CHECK (delivery_status IN ('pending', 'sent', 'failed'));

-- Enable RLS on password_delivery_log
ALTER TABLE public.password_delivery_log ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only platform admins can view
CREATE POLICY "platform_admins_view_delivery_log" ON public.password_delivery_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_users 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'support_admin')
    )
  );

-- 4. Add status column to user_roles
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS suspension_metadata JSONB DEFAULT '{}'::jsonb;

-- Add check constraint for status
ALTER TABLE public.user_roles
ADD CONSTRAINT user_roles_status_check 
CHECK (status IN ('active', 'suspended', 'pending'));

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_status 
ON public.user_roles(status);

CREATE INDEX IF NOT EXISTS idx_user_roles_tenant_status 
ON public.user_roles(tenant_id, status);

-- 5. Create platform_impersonation_sessions table
CREATE TABLE IF NOT EXISTS public.platform_impersonation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  tenant_id UUID NOT NULL,
  impersonated_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT,
  actions_performed JSONB DEFAULT '[]'::jsonb
);

-- Enable RLS on platform_impersonation_sessions
ALTER TABLE public.platform_impersonation_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only platform admins can view impersonation logs
CREATE POLICY "platform_admins_view_impersonation" ON public.platform_impersonation_sessions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_users 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'support_admin')
    )
  );

-- RLS Policy: Only platform admins can create impersonation sessions
CREATE POLICY "platform_admins_create_impersonation" ON public.platform_impersonation_sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM platform_users 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'support_admin')
    )
  );

-- RLS Policy: Only platform admins can update impersonation sessions
CREATE POLICY "platform_admins_update_impersonation" ON public.platform_impersonation_sessions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_users 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'support_admin')
    )
  );

-- 6. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_password_delivery_log_user_id 
ON public.password_delivery_log(user_id);

CREATE INDEX IF NOT EXISTS idx_password_delivery_log_delivered_at 
ON public.password_delivery_log(delivered_at DESC);

CREATE INDEX IF NOT EXISTS idx_impersonation_sessions_admin_id 
ON public.platform_impersonation_sessions(admin_id);

CREATE INDEX IF NOT EXISTS idx_impersonation_sessions_tenant_id 
ON public.platform_impersonation_sessions(tenant_id);

CREATE INDEX IF NOT EXISTS idx_platform_users_phone 
ON public.platform_users(phone) WHERE phone IS NOT NULL;