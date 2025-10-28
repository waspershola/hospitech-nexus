-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('owner', 'manager', 'frontdesk', 'housekeeping', 'maintenance', 'guest');

-- Tenants table
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  domain TEXT,
  logo_url TEXT,
  brand_color TEXT DEFAULT '#D4AF37',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User roles table (CRITICAL: roles stored separately)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, tenant_id, role)
);

-- Profiles table (basic user info only, NO roles)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Rooms table
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  number TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'available',
  rate NUMERIC(10,2),
  floor INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, number)
);

-- Guests table
CREATE TABLE public.guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  id_number TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Bookings table
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  room_id UUID REFERENCES public.rooms(id) NOT NULL,
  guest_id UUID REFERENCES public.guests(id) NOT NULL,
  check_in TIMESTAMPTZ NOT NULL,
  check_out TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending',
  total_amount NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Requests table (for guest portal)
CREATE TABLE public.requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  room_id UUID REFERENCES public.rooms(id),
  guest_id UUID REFERENCES public.guests(id),
  type TEXT NOT NULL,
  note TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Security Definer function to check user role (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _tenant_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND tenant_id = _tenant_id
      AND role = _role
  );
$$;

-- Security Definer function to get user's tenant
CREATE OR REPLACE FUNCTION public.get_user_tenant(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.user_roles WHERE user_id = _user_id LIMIT 1;
$$;

-- Enable RLS on all tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenants
CREATE POLICY "Users can view their tenant"
  ON public.tenants FOR SELECT
  USING (id = public.get_user_tenant(auth.uid()));

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- RLS Policies for rooms
CREATE POLICY "Users can view rooms in their tenant"
  ON public.rooms FOR SELECT
  USING (tenant_id = public.get_user_tenant(auth.uid()));

CREATE POLICY "Staff can manage rooms in their tenant"
  ON public.rooms FOR ALL
  USING (tenant_id = public.get_user_tenant(auth.uid()));

-- RLS Policies for guests
CREATE POLICY "Users can view guests in their tenant"
  ON public.guests FOR SELECT
  USING (tenant_id = public.get_user_tenant(auth.uid()));

CREATE POLICY "Staff can manage guests in their tenant"
  ON public.guests FOR ALL
  USING (tenant_id = public.get_user_tenant(auth.uid()));

-- RLS Policies for bookings
CREATE POLICY "Users can view bookings in their tenant"
  ON public.bookings FOR SELECT
  USING (tenant_id = public.get_user_tenant(auth.uid()));

CREATE POLICY "Staff can manage bookings in their tenant"
  ON public.bookings FOR ALL
  USING (tenant_id = public.get_user_tenant(auth.uid()));

-- RLS Policies for requests
CREATE POLICY "Users can view requests in their tenant"
  ON public.requests FOR SELECT
  USING (tenant_id = public.get_user_tenant(auth.uid()));

CREATE POLICY "Guests can create requests"
  ON public.requests FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant(auth.uid()));

CREATE POLICY "Staff can manage requests in their tenant"
  ON public.requests FOR ALL
  USING (tenant_id = public.get_user_tenant(auth.uid()));

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();