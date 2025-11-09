-- Phase 1: Create platform_email_templates table
CREATE TABLE IF NOT EXISTS public.platform_email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_key TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  is_active BOOLEAN DEFAULT true,
  language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, event_key, language)
);

CREATE INDEX idx_email_templates_event ON public.platform_email_templates(tenant_id, event_key, is_active);

-- Enable RLS
ALTER TABLE public.platform_email_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for platform_email_templates
CREATE POLICY "Platform admins manage global templates"
ON public.platform_email_templates
FOR ALL
USING (
  tenant_id IS NULL AND 
  is_platform_admin(auth.uid())
);

CREATE POLICY "Tenants manage their templates"
ON public.platform_email_templates
FOR ALL
USING (
  tenant_id = get_user_tenant(auth.uid())
);

CREATE POLICY "Users view their tenant templates"
ON public.platform_email_templates
FOR SELECT
USING (
  tenant_id = get_user_tenant(auth.uid()) OR 
  (tenant_id IS NULL AND auth.role() = 'authenticated')
);

-- Phase 2: Create tenant_email_usage_logs table
CREATE TABLE IF NOT EXISTS public.tenant_email_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_key TEXT,
  recipient TEXT NOT NULL,
  subject TEXT,
  status TEXT CHECK (status IN ('sent', 'failed')),
  provider TEXT,
  message_id TEXT,
  error_message TEXT,
  booking_id UUID,
  guest_id UUID,
  sent_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_email_logs_tenant ON public.tenant_email_usage_logs(tenant_id, created_at DESC);
CREATE INDEX idx_email_logs_status ON public.tenant_email_usage_logs(tenant_id, status, sent_at);

-- Enable RLS
ALTER TABLE public.tenant_email_usage_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenant_email_usage_logs
CREATE POLICY "Tenants view their email logs"
ON public.tenant_email_usage_logs
FOR SELECT
USING (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY "System insert email logs"
ON public.tenant_email_usage_logs
FOR INSERT
WITH CHECK (tenant_id = get_user_tenant(auth.uid()));

-- Phase 3: Seed default email templates
INSERT INTO public.platform_email_templates (tenant_id, event_key, subject, body_html, body_text)
VALUES 
  (
    NULL, 
    'booking_confirmed', 
    'Booking Confirmation - {{hotel_name}}',
    '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Booking Confirmation</h2>
      <p>Dear {{guest_name}},</p>
      <p>Thank you for choosing {{hotel_name}}! Your booking has been confirmed.</p>
      <div style="background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
        <p><strong>Booking Reference:</strong> {{booking_reference}}</p>
        <p><strong>Room:</strong> {{room_number}}</p>
        <p><strong>Check-in:</strong> {{check_in_date}}</p>
        <p><strong>Check-out:</strong> {{check_out_date}}</p>
      </div>
      <p>We look forward to welcoming you!</p>
      <p style="margin-top: 30px;">For assistance, contact our frontdesk: {{frontdesk_phone}}</p>
      <p style="color: #666; font-size: 12px;">{{hotel_name}}</p>
    </div>',
    'Booking Confirmation\n\nDear {{guest_name}},\n\nThank you for choosing {{hotel_name}}! Your booking has been confirmed.\n\nBooking Reference: {{booking_reference}}\nRoom: {{room_number}}\nCheck-in: {{check_in_date}}\nCheck-out: {{check_out_date}}\n\nWe look forward to welcoming you!\n\nFor assistance, contact our frontdesk: {{frontdesk_phone}}\n\n{{hotel_name}}'
  ),
  (
    NULL,
    'payment_received',
    'Payment Receipt - {{hotel_name}}',
    '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Payment Receipt</h2>
      <p>Dear {{guest_name}},</p>
      <p>We have received your payment. Thank you!</p>
      <div style="background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
        <p><strong>Receipt Number:</strong> {{receipt_number}}</p>
        <p><strong>Amount:</strong> {{currency_symbol}}{{amount}}</p>
        <p><strong>Payment Method:</strong> {{payment_method}}</p>
        <p><strong>Date:</strong> {{payment_date}}</p>
      </div>
      <p>This receipt confirms your payment has been successfully processed.</p>
      <p style="margin-top: 30px;">For assistance, contact our frontdesk: {{frontdesk_phone}}</p>
      <p style="color: #666; font-size: 12px;">{{hotel_name}}</p>
    </div>',
    'Payment Receipt\n\nDear {{guest_name}},\n\nWe have received your payment. Thank you!\n\nReceipt Number: {{receipt_number}}\nAmount: {{currency_symbol}}{{amount}}\nPayment Method: {{payment_method}}\nDate: {{payment_date}}\n\nThis receipt confirms your payment has been successfully processed.\n\nFor assistance, contact our frontdesk: {{frontdesk_phone}}\n\n{{hotel_name}}'
  ),
  (
    NULL,
    'checkout_confirmation',
    'Thank You - {{hotel_name}}',
    '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Thank You for Your Stay!</h2>
      <p>Dear {{guest_name}},</p>
      <p>Thank you for choosing {{hotel_name}}. We hope you enjoyed your stay in Room {{room_number}}.</p>
      <p>We would love to welcome you back again soon!</p>
      <p style="margin-top: 30px;">For future bookings or assistance, contact our frontdesk: {{frontdesk_phone}}</p>
      <p style="color: #666; font-size: 12px;">{{hotel_name}}<br>Safe travels!</p>
    </div>',
    'Thank You for Your Stay!\n\nDear {{guest_name}},\n\nThank you for choosing {{hotel_name}}. We hope you enjoyed your stay in Room {{room_number}}.\n\nWe would love to welcome you back again soon!\n\nFor future bookings or assistance, contact our frontdesk: {{frontdesk_phone}}\n\n{{hotel_name}}\nSafe travels!'
  ),
  (
    NULL,
    'check_in_reminder',
    'Check-in Reminder - {{hotel_name}}',
    '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Check-in Reminder</h2>
      <p>Dear {{guest_name}},</p>
      <p>This is a friendly reminder that your check-in is scheduled for tomorrow at {{hotel_name}}.</p>
      <div style="background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
        <p><strong>Booking Reference:</strong> {{booking_reference}}</p>
        <p><strong>Room:</strong> {{room_number}}</p>
        <p><strong>Check-in Date:</strong> {{check_in_date}}</p>
      </div>
      <p>We look forward to welcoming you!</p>
      <p style="margin-top: 30px;">For assistance, contact our frontdesk: {{frontdesk_phone}}</p>
      <p style="color: #666; font-size: 12px;">{{hotel_name}}</p>
    </div>',
    'Check-in Reminder\n\nDear {{guest_name}},\n\nThis is a friendly reminder that your check-in is scheduled for tomorrow at {{hotel_name}}.\n\nBooking Reference: {{booking_reference}}\nRoom: {{room_number}}\nCheck-in Date: {{check_in_date}}\n\nWe look forward to welcoming you!\n\nFor assistance, contact our frontdesk: {{frontdesk_phone}}\n\n{{hotel_name}}'
  )
ON CONFLICT (tenant_id, event_key, language) DO NOTHING;