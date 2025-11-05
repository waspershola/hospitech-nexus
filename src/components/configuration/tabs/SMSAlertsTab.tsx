import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConfigSection } from '../shared/ConfigSection';
import { useSMSAlertSettings } from '@/hooks/useSMSAlertSettings';
import { SMSCronJobSetup } from './SMSCronJobSetup';
import { Bell, Plus, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function SMSAlertsTab() {
  const { settings, alertLogs, isLoading, saveSettings, checkQuota } = useSMSAlertSettings();
  
  const [alertEnabled, setAlertEnabled] = useState(true);
  const [thresholdPercent, setThresholdPercent] = useState(20);
  const [thresholdAbsolute, setThresholdAbsolute] = useState<number | undefined>();
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifySms, setNotifySms] = useState(false);
  const [recipients, setRecipients] = useState<string[]>([]);
  const [newRecipient, setNewRecipient] = useState('');

  useEffect(() => {
    if (settings) {
      setAlertEnabled(settings.alert_enabled);
      setThresholdPercent(settings.alert_threshold_percent);
      setThresholdAbsolute(settings.alert_threshold_absolute || undefined);
      setNotifyEmail(settings.notify_email);
      setNotifySms(settings.notify_sms);
      setRecipients((settings.alert_recipients as string[]) || []);
    }
  }, [settings]);

  const handleAddRecipient = () => {
    if (newRecipient && !recipients.includes(newRecipient)) {
      setRecipients([...recipients, newRecipient]);
      setNewRecipient('');
    }
  };

  const handleRemoveRecipient = (recipient: string) => {
    setRecipients(recipients.filter(r => r !== recipient));
  };

  const handleSave = () => {
    saveSettings.mutate({
      alert_enabled: alertEnabled,
      alert_threshold_percent: thresholdPercent,
      alert_threshold_absolute: thresholdAbsolute || null,
      notify_email: notifyEmail,
      notify_sms: notifySms,
      alert_recipients: recipients,
    });
  };

  const handleTestAlert = () => {
    checkQuota.mutate();
  };

  return (
    <div className="space-y-6">
      <ConfigSection
        title="SMS Quota Alert Settings"
        description="Configure automatic alerts when SMS credits are running low"
        icon={Bell}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Quota Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Automatically notify when SMS credits are low
              </p>
            </div>
            <Switch checked={alertEnabled} onCheckedChange={setAlertEnabled} />
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="font-medium">Alert Thresholds</h4>
            
            <div className="space-y-2">
              <Label>Percentage Threshold (%)</Label>
              <Input
                type="number"
                min="1"
                max="100"
                value={thresholdPercent}
                onChange={(e) => setThresholdPercent(parseInt(e.target.value) || 20)}
              />
              <p className="text-sm text-muted-foreground">
                Alert when remaining credits fall below this percentage
              </p>
            </div>

            <div className="space-y-2">
              <Label>Absolute Threshold (Optional)</Label>
              <Input
                type="number"
                min="0"
                placeholder="e.g., 100"
                value={thresholdAbsolute || ''}
                onChange={(e) => setThresholdAbsolute(e.target.value ? parseInt(e.target.value) : undefined)}
              />
              <p className="text-sm text-muted-foreground">
                Alert when remaining credits fall below this number
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="font-medium">Notification Channels</h4>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Send alerts via email</p>
              </div>
              <Switch checked={notifyEmail} onCheckedChange={setNotifyEmail} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>SMS Notifications</Label>
                <p className="text-sm text-muted-foreground">Send alerts via SMS</p>
              </div>
              <Switch checked={notifySms} onCheckedChange={setNotifySms} />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="font-medium">Alert Recipients</h4>
            <p className="text-sm text-muted-foreground">
              Add email addresses or phone numbers to receive alerts
            </p>

            <div className="flex gap-2">
              <Input
                placeholder="email@example.com or +234XXXXXXXXXX"
                value={newRecipient}
                onChange={(e) => setNewRecipient(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddRecipient()}
              />
              <Button onClick={handleAddRecipient} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {recipients.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {recipients.map((recipient) => (
                  <Badge key={recipient} variant="secondary" className="gap-1">
                    {recipient}
                    <button
                      onClick={() => handleRemoveRecipient(recipient)}
                      className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Separator />

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saveSettings.isPending}>
              {saveSettings.isPending ? 'Saving...' : 'Save Alert Settings'}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleTestAlert}
              disabled={checkQuota.isPending}
            >
              {checkQuota.isPending ? 'Checking...' : 'Test Alert Now'}
            </Button>
          </div>
        </div>
      </ConfigSection>

      <SMSCronJobSetup />

      {alertLogs && alertLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Alerts</CardTitle>
            <CardDescription>History of sent quota alerts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alertLogs.map((log) => (
                <Alert key={log.id}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm">{log.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(log.sent_at).toLocaleString()} • {log.quota_remaining} credits remaining
                      </p>
                    </div>
                    <Badge variant={log.alert_type === 'absolute' ? 'destructive' : 'default'}>
                      {log.alert_type}
                    </Badge>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {settings?.last_alert_sent_at && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            Last alert sent: {new Date(settings.last_alert_sent_at).toLocaleString()}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
