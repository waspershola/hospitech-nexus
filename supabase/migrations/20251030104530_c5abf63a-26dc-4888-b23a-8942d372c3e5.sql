-- Add missing columns to hotel_financials table
ALTER TABLE public.hotel_financials
ADD COLUMN IF NOT EXISTS vat_applied_on text DEFAULT 'subtotal' CHECK (vat_applied_on IN ('base', 'subtotal')),
ADD COLUMN IF NOT EXISTS rounding text DEFAULT 'round' CHECK (rounding IN ('round', 'floor', 'ceil'));