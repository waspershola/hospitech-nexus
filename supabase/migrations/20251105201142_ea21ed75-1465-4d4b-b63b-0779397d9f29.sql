-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule low SMS credits check to run every 6 hours
SELECT cron.schedule(
  'check-low-sms-credits',
  '0 */6 * * *', -- Every 6 hours
  $$
  SELECT
    net.http_post(
        url:='https://akchmpmzcupzjaeewdui.supabase.co/functions/v1/check-low-sms-credits',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrY2htcG16Y3VwemphZWV3ZHVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NTg0MTMsImV4cCI6MjA3NzIzNDQxM30.BqjNXhwKlNAAjRT0b7c86fkPe2htu19duz25kuCtEg4"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);