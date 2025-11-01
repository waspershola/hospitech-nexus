-- Phase 1-4: Database Schema Enhancements

-- 1. Guests Table Enhancement (Phase 2)
ALTER TABLE guests
ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
ADD COLUMN IF NOT EXISTS last_stay_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS total_bookings integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_spent numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS notes text;

-- Create indexes for guests
CREATE INDEX IF NOT EXISTS idx_guests_tags ON guests USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_guests_status ON guests(status);
CREATE INDEX IF NOT EXISTS idx_guests_last_stay ON guests(last_stay_date DESC);

-- 2. Wallet Transactions Performance Indexes (Phase 1)
CREATE INDEX IF NOT EXISTS idx_wallet_txns_created_at ON wallet_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_txns_type ON wallet_transactions(type);
CREATE INDEX IF NOT EXISTS idx_wallet_txns_wallet_created ON wallet_transactions(wallet_id, created_at DESC);

-- 3. Bookings Enhancement (Phase 3)
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS source text DEFAULT 'front_desk',
ADD COLUMN IF NOT EXISTS booking_reference text,
ADD COLUMN IF NOT EXISTS notes text;

-- Create indexes for bookings
CREATE INDEX IF NOT EXISTS idx_bookings_source ON bookings(source);
CREATE INDEX IF NOT EXISTS idx_bookings_reference ON bookings(booking_reference);

-- 4. Guest Communication Log Table (Phase 2)
CREATE TABLE IF NOT EXISTS guest_communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  guest_id uuid NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  type text NOT NULL, -- 'email', 'sms', 'whatsapp', 'call', 'note'
  direction text NOT NULL, -- 'inbound', 'outbound'
  subject text,
  message text,
  status text DEFAULT 'sent', -- 'sent', 'delivered', 'read', 'failed'
  sent_by uuid REFERENCES profiles(id),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on guest_communications
ALTER TABLE guest_communications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for guest_communications
CREATE POLICY "Users can view their tenant communications"
ON guest_communications FOR SELECT
USING (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY "Staff can manage communications"
ON guest_communications FOR ALL
USING (tenant_id = get_user_tenant(auth.uid()));

-- Create indexes for guest_communications
CREATE INDEX IF NOT EXISTS idx_guest_comms_guest ON guest_communications(guest_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guest_comms_tenant ON guest_communications(tenant_id);

-- 5. Function to auto-generate booking reference
CREATE OR REPLACE FUNCTION generate_booking_reference()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.booking_reference IS NULL THEN
    NEW.booking_reference := 'BKG-' || 
                            EXTRACT(YEAR FROM NEW.created_at)::text || '-' || 
                            LPAD(EXTRACT(DOY FROM NEW.created_at)::text, 3, '0') || '-' || 
                            UPPER(SUBSTRING(NEW.id::text, 1, 6));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for booking reference
DROP TRIGGER IF EXISTS set_booking_reference ON bookings;
CREATE TRIGGER set_booking_reference
BEFORE INSERT ON bookings
FOR EACH ROW
EXECUTE FUNCTION generate_booking_reference();

-- 6. Function to update guest statistics
CREATE OR REPLACE FUNCTION update_guest_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update guest stats when booking is checked out
  IF NEW.status = 'checked_out' AND (OLD.status IS NULL OR OLD.status != 'checked_out') THEN
    UPDATE guests
    SET 
      total_bookings = COALESCE(total_bookings, 0) + 1,
      last_stay_date = NEW.check_out,
      total_spent = COALESCE(total_spent, 0) + COALESCE(NEW.total_amount, 0)
    WHERE id = NEW.guest_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for guest stats
DROP TRIGGER IF EXISTS update_guest_statistics ON bookings;
CREATE TRIGGER update_guest_statistics
AFTER INSERT OR UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION update_guest_stats();