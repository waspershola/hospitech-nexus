import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function SMSCronJobSetup() {
  const [cronJobStatus] = useState<'unknown' | 'active' | 'error'>('unknown');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Automated Quota Monitoring
        </CardTitle>
        <CardDescription>
          Schedule automatic daily checks for low SMS credit alerts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Enable automated daily monitoring to check SMS quotas and send alerts when credits are running low. 
            The system will check all tenants at 9:00 AM UTC daily.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">Daily Quota Check</p>
              <p className="text-sm text-muted-foreground">Runs at 9:00 AM UTC every day</p>
            </div>
            {cronJobStatus === 'active' && (
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Active
              </Badge>
            )}
            {cronJobStatus === 'error' && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Error
              </Badge>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            To manually enable automated monitoring, run this SQL command in your Supabase SQL Editor:
          </p>

          <div className="p-4 bg-muted rounded-lg font-mono text-xs overflow-x-auto">
            <pre>{`SELECT cron.schedule(
  'daily-sms-quota-check',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url:='https://akchmpmzcupzjaeewdui.supabase.co/functions/v1/daily-sms-quota-check',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrY2htcG16Y3VwemphZWV3ZHVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NTg0MTMsImV4cCI6MjA3NzIzNDQxM30.BqjNXhwKlNAAjRT0b7c86fkPe2htu19duz25kuCtEg4"}'::jsonb,
    body:='{"time": "' || now() || '"}'::jsonb
  ) as request_id;
  $$
);`}</pre>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Note:</strong> Run this command in the Supabase SQL Editor to activate automated monitoring.
              <a 
                href="https://supabase.com/dashboard/project/akchmpmzcupzjaeewdui/sql/new" 
                target="_blank" 
                rel="noopener noreferrer"
                className="ml-2 text-primary hover:underline"
              >
                Open SQL Editor →
              </a>
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  );
}
