-- Update check-in welcome email template with QR code access instructions
-- Remove WiFi instruction and replace room phone dial with QR code scanning
UPDATE platform_email_templates
SET 
  body_html = '<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .info-box { background: #f0f7ff; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Welcome to {{hotel_name}}!</h1>
      <p>We''re delighted to have you with us</p>
    </div>
    <div class="content">
      <p>Dear {{guest_name}},</p>
      
      <p>Welcome! Your room is ready and we hope you have a wonderful stay with us.</p>
      
      <div class="info-box">
        <h3>📋 Your Stay Details</h3>
        <p><strong>Room Type:</strong> {{room_type}}</p>
        <p><strong>Check-out:</strong> {{check_out_date}} at 12:00 PM</p>
      </div>

      <h3>🔔 During Your Stay</h3>
      <ul>
        <li>Need anything? Scan QR code with your phone camera</li>
        <li>Access all services instantly with any language</li>
        <li>Breakfast served daily 7:00 AM - 10:00 AM</li>
        <li>24/7 front desk support</li>
      </ul>

      <p>If you need any assistance, our team is here to help make your stay comfortable and memorable.</p>

      <p>Warm regards,<br>
      <strong>{{hotel_name}} Team</strong></p>
    </div>
    <div class="footer">
      <p>{{hotel_name}}<br>
      {{frontdesk_phone}} | {{contact_email}}</p>
    </div>
  </div>
</body>
</html>',
  body_text = 'Welcome to {{hotel_name}}!

Dear {{guest_name}},

Welcome! Your room is ready and we hope you have a wonderful stay with us.

YOUR STAY DETAILS
Room Type: {{room_type}}
Check-out: {{check_out_date}} at 12:00 PM

DURING YOUR STAY
- Need anything? Scan QR code with your phone camera
- Access all services instantly with any language
- Breakfast served daily 7:00 AM - 10:00 AM
- 24/7 front desk support

If you need any assistance, our team is here to help make your stay comfortable and memorable.

Warm regards,
{{hotel_name}} Team

{{hotel_name}}
{{frontdesk_phone}} | {{contact_email}}',
  updated_at = NOW()
WHERE event_key = 'check_in_welcome' AND tenant_id IS NULL;