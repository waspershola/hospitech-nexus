-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule monthly platform fee billing to run on the 1st of each month at 2:00 AM
SELECT cron.schedule(
  'monthly-platform-fee-billing',
  '0 2 1 * *', -- Run at 2:00 AM on the 1st day of each month
  $$
  SELECT
    net.http_post(
      url:='https://akchmpmzcupzjaeewdui.supabase.co/functions/v1/platform-fee-billing',
      headers:=jsonb_build_object(
        'Content-Type','application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrY2htcG16Y3VwemphZWV3ZHVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NTg0MTMsImV4cCI6MjA3NzIzNDQxM30.BqjNXhwKlNAAjRT0b7c86fkPe2htu19duz25kuCtEg4'
      ),
      body:='{}'::jsonb
    ) as request_id;
  $$
);

-- Add comment for documentation
COMMENT ON EXTENSION pg_cron IS 'Job scheduler for PostgreSQL - used for monthly platform fee billing';
