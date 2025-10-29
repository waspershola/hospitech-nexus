-- Add organization_id column to bookings table for corporate bookings
ALTER TABLE public.bookings 
ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Add index for faster queries on organization bookings
CREATE INDEX idx_bookings_organization_id ON public.bookings(organization_id);

-- Add comment for documentation
COMMENT ON COLUMN public.bookings.organization_id IS 'Reference to organization for corporate bookings. NULL for individual guest bookings.';