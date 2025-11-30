-- MANUAL EMAIL TEMPLATES UPDATE
-- Run this SQL in Supabase SQL Editor to update email templates
-- This updates booking_confirmed and creates check_in_welcome templates

-- 1. Update booking_confirmed template with rich HTML
UPDATE platform_email_templates
SET 
  subject = 'Booking Confirmation - {{booking_reference}} at {{hotel_name}}',
  body_html = '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { background: #f9fafb; padding: 30px 20px; border: 1px solid #e5e7eb; }
    .booking-card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
    .detail-row:last-child { border-bottom: none; }
    .label { font-weight: 600; color: #6b7280; }
    .value { color: #111827; font-weight: 500; }
    .pricing-summary { background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .total-row { font-size: 18px; font-weight: 700; color: #111827; padding-top: 10px; border-top: 2px solid #d1d5db; margin-top: 10px; }
    .footer { background: #111827; color: #9ca3af; padding: 20px; text-align: center; font-size: 12px; border-radius: 0 0 10px 10px; }
    .highlight { background: #eef2ff; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0; border-radius: 4px; }
    @media only screen and (max-width: 600px) { .detail-row { flex-direction: column; } .value { margin-top: 5px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>✅ Booking Confirmed</h1>
    <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.95;">Thank you for choosing {{hotel_name}}</p>
  </div>
  <div class="content">
    <p style="font-size: 16px; margin-top: 0;">Dear <strong>{{guest_name}}</strong>,</p>
    <p>Your reservation has been successfully confirmed! We look forward to welcoming you.</p>
    <div class="booking-card">
      <h2 style="margin-top: 0; color: #667eea; font-size: 20px;">Booking Details</h2>
      <div class="detail-row"><span class="label">Booking Reference:</span><span class="value">{{booking_reference}}</span></div>
      <div class="detail-row"><span class="label">Room Type:</span><span class="value">{{room_type}}</span></div>
      <div class="detail-row"><span class="label">Check-In:</span><span class="value">{{check_in_date}} (From 2:00 PM)</span></div>
      <div class="detail-row"><span class="label">Check-Out:</span><span class="value">{{check_out_date}} (Until 12:00 PM)</span></div>
      <div class="detail-row"><span class="label">Number of Nights:</span><span class="value">{{nights}}</span></div>
    </div>
    <div class="pricing-summary">
      <h3 style="margin-top: 0; color: #374151; font-size: 18px;">Pricing Summary</h3>
      <div class="detail-row"><span class="label">Rate per Night:</span><span class="value">₦{{rate_per_night}}</span></div>
      <div class="detail-row"><span class="label">{{nights}} Night(s):</span><span class="value">₦{{total_amount}}</span></div>
      <div class="detail-row total-row"><span>Total Amount:</span><span>₦{{total_amount}}</span></div>
    </div>
    <div class="highlight"><strong>📱 Need Help?</strong><br>Contact our front desk at {{frontdesk_phone}} or {{contact_email}} for any assistance.</div>
    <p style="text-align: center; font-size: 16px; color: #667eea; font-weight: 600;">We look forward to welcoming you!</p>
  </div>
  <div class="footer">
    <p style="margin: 0 0 10px 0;"><strong>{{hotel_name}}</strong></p>
    <p style="margin: 5px 0;">This is a computer-generated confirmation and does not require a signature.</p>
  </div>
</body>
</html>',
  body_text = 'BOOKING CONFIRMATION

Dear {{guest_name}},

Your reservation at {{hotel_name}} has been confirmed!

BOOKING DETAILS
Booking Reference: {{booking_reference}}
Room Type: {{room_type}}
Check-In: {{check_in_date}} (From 2:00 PM)
Check-Out: {{check_out_date}} (Until 12:00 PM)
Number of Nights: {{nights}}

PRICING SUMMARY
Rate per Night: ₦{{rate_per_night}}
{{nights}} Night(s): ₦{{total_amount}}
Total Amount: ₦{{total_amount}}

Need Help?
Contact our front desk at {{frontdesk_phone}}.

We look forward to welcoming you!

---
{{hotel_name}}',
  updated_at = now()
WHERE event_key = 'booking_confirmed';

-- 2. Create check_in_welcome template (delete existing first if needed)
DELETE FROM platform_email_templates 
WHERE tenant_id IS NULL AND event_key = 'check_in_welcome';

INSERT INTO platform_email_templates (tenant_id, event_key, subject, body_html, body_text, is_active)
VALUES (
  NULL,
  'check_in_welcome',
  'Welcome to {{hotel_name}}!',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { background: #f9fafb; padding: 30px 20px; border: 1px solid #e5e7eb; }
    .welcome-card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .highlight { background: #d1fae5; padding: 15px; border-left: 4px solid #10b981; margin: 20px 0; border-radius: 4px; }
    .footer { background: #111827; color: #9ca3af; padding: 20px; text-align: center; font-size: 12px; border-radius: 0 0 10px 10px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎉 Welcome to {{hotel_name}}!</h1>
    <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.95;">You''re all checked in</p>
  </div>
  <div class="content">
    <p style="font-size: 16px; margin-top: 0;">Dear <strong>{{guest_name}}</strong>,</p>
    <p>Welcome! We''re delighted to have you staying with us. Your room is ready and we hope you have a wonderful stay.</p>
    <div class="welcome-card">
      <h2 style="margin-top: 0; color: #10b981; font-size: 20px;">Your Stay Details</h2>
      <p><strong>Room Type:</strong> {{room_type}}</p>
      <p><strong>Check-Out Date:</strong> {{check_out_date}}</p>
      <p style="margin-bottom: 0;"><strong>Check-Out Time:</strong> 12:00 PM</p>
    </div>
    <div class="highlight">
      <strong>💡 During Your Stay</strong><br>
      • Complimentary WiFi available<br>
      • Room service available 24/7<br>
      • Need anything? Just dial 0 from your room phone
    </div>
    <p style="text-align: center; font-size: 16px; color: #10b981; font-weight: 600; margin-top: 30px;">Enjoy your stay!</p>
  </div>
  <div class="footer">
    <p style="margin: 0;"><strong>{{hotel_name}}</strong></p>
  </div>
</body>
</html>',
  'WELCOME TO {{hotel_name}}!

Dear {{guest_name}},

Welcome! We''re delighted to have you staying with us.

YOUR STAY DETAILS
Room Type: {{room_type}}
Check-Out Date: {{check_out_date}}
Check-Out Time: 12:00 PM

Enjoy your stay!

---
{{hotel_name}}',
  true
);
