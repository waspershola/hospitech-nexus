import { useConfigStore } from '@/stores/configStore';
import { ConfigCard } from '../shared/ConfigCard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Clock, DollarSign, Bell, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function CheckoutPolicyTab() {
  const configurations = useConfigStore(state => state.configurations);
  const updateConfig = useConfigStore(state => state.updateConfig);
  const saveConfig = useConfigStore(state => state.saveConfig);
  const hasCheckoutUnsaved = useConfigStore(state => state.unsavedChanges.includes('checkout_policy'));
  const sectionError = useConfigStore(state => state.sectionErrors.checkout_policy);
  const lastSaved = useConfigStore(state => state.sectionLastSaved.checkout_policy);
  const checkoutPolicy = configurations.checkout_policy || {};

  const handleChange = (field: string, value: any) => {
    updateConfig('checkout_policy', { ...checkoutPolicy, [field]: value });
  };

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Configure late checkout fees and automated reminder notifications. These settings apply hotel-wide.
        </AlertDescription>
      </Alert>

      <ConfigCard
        title="Late Checkout Fees"
        description="Charges applied when guests overstay their checkout time"
        icon={DollarSign}
        onSave={() => saveConfig('checkout_policy')}
        hasUnsavedChanges={hasCheckoutUnsaved}
        lastSaved={lastSaved}
        error={sectionError}
        sectionKey="checkout_policy"
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-4 border-b">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="enableLateFees" className="text-base">
                Enable Late Checkout Fees
              </Label>
              <p className="text-sm text-muted-foreground">
                Automatically calculate fees for guests who overstay checkout time
              </p>
            </div>
            <Switch
              id="enableLateFees"
              checked={checkoutPolicy.enableLateFees ?? true}
              onCheckedChange={(checked) => handleChange('enableLateFees', checked)}
            />
          </div>

          {checkoutPolicy.enableLateFees !== false && (
            <>
              <div className="grid gap-6">
                <div className="space-y-2">
                  <Label htmlFor="hourlyRate">Hourly Late Fee (₦)</Label>
                  <Input
                    id="hourlyRate"
                    type="number"
                    min="0"
                    step="100"
                    value={checkoutPolicy.hourlyRate || 1000}
                    onChange={(e) => handleChange('hourlyRate', Number(e.target.value))}
                    placeholder="1000"
                  />
                  <p className="text-xs text-muted-foreground">
                    Fee charged per hour for late checkout (after grace period)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dailyRate">Daily Late Fee (₦)</Label>
                  <Input
                    id="dailyRate"
                    type="number"
                    min="0"
                    step="1000"
                    value={checkoutPolicy.dailyRate || 10000}
                    onChange={(e) => handleChange('dailyRate', Number(e.target.value))}
                    placeholder="10000"
                  />
                  <p className="text-xs text-muted-foreground">
                    Fee charged per full day (24 hours) overstayed
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gracePeriodHours">Grace Period (Hours)</Label>
                  <Input
                    id="gracePeriodHours"
                    type="number"
                    min="0"
                    max="12"
                    step="0.5"
                    value={checkoutPolicy.gracePeriodHours ?? 2}
                    onChange={(e) => handleChange('gracePeriodHours', Number(e.target.value))}
                    placeholder="2"
                  />
                  <p className="text-xs text-muted-foreground">
                    Free period after checkout time before fees apply (recommended: 1-2 hours)
                  </p>
                </div>
              </div>

              <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
                <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-blue-900 dark:text-blue-100">
                  Example: With a 2-hour grace period, if checkout is 12:00 PM:
                  <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                    <li>No fee: 12:00 PM - 2:00 PM (grace period)</li>
                    <li>Hourly fee: 2:01 PM onwards until 24 hours</li>
                    <li>Daily fee: After 24 hours (2:00 PM next day)</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </>
          )}
        </div>
      </ConfigCard>

      <ConfigCard
        title="Checkout Reminders"
        description="Automated email/SMS notifications before checkout time"
        icon={Bell}
        onSave={() => saveConfig('checkout_policy')}
        hasUnsavedChanges={hasCheckoutUnsaved}
        lastSaved={lastSaved}
        error={sectionError}
        sectionKey="checkout_policy"
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-4 border-b">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="enableReminders" className="text-base">
                Enable Checkout Reminders
              </Label>
              <p className="text-sm text-muted-foreground">
                Send automated reminders to guests before their checkout time
              </p>
            </div>
            <Switch
              id="enableReminders"
              checked={checkoutPolicy.enableReminders ?? true}
              onCheckedChange={(checked) => handleChange('enableReminders', checked)}
            />
          </div>

          {checkoutPolicy.enableReminders !== false && (
            <>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5 flex-1">
                    <Label htmlFor="reminder24h" className="text-base">
                      24-Hour Reminder
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Send reminder 24 hours before checkout
                    </p>
                  </div>
                  <Switch
                    id="reminder24h"
                    checked={checkoutPolicy.reminder24h ?? true}
                    onCheckedChange={(checked) => handleChange('reminder24h', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5 flex-1">
                    <Label htmlFor="reminder2h" className="text-base">
                      2-Hour Reminder
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Send reminder 2 hours before checkout
                    </p>
                  </div>
                  <Switch
                    id="reminder2h"
                    checked={checkoutPolicy.reminder2h ?? true}
                    onCheckedChange={(checked) => handleChange('reminder2h', checked)}
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <Label className="text-base">Notification Channels</Label>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5 flex-1">
                    <Label htmlFor="sendEmail" className="text-sm font-normal">
                      Send via Email
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Email reminders to guest's registered email
                    </p>
                  </div>
                  <Switch
                    id="sendEmail"
                    checked={checkoutPolicy.sendEmail ?? true}
                    onCheckedChange={(checked) => handleChange('sendEmail', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5 flex-1">
                    <Label htmlFor="sendSMS" className="text-sm font-normal">
                      Send via SMS
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Text message to guest's phone number (requires SMS provider)
                    </p>
                  </div>
                  <Switch
                    id="sendSMS"
                    checked={checkoutPolicy.sendSMS ?? false}
                    onCheckedChange={(checked) => handleChange('sendSMS', checked)}
                  />
                </div>
              </div>

              <Alert className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
                <Bell className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <AlertDescription className="text-amber-900 dark:text-amber-100 text-sm">
                  <strong>Note:</strong> Email reminders require email settings to be configured. 
                  SMS requires a third-party SMS provider integration (Twilio, etc.).
                </AlertDescription>
              </Alert>
            </>
          )}
        </div>
      </ConfigCard>
    </div>
  );
}
