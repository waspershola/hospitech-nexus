import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MessageSquare, Send, Settings, ShoppingCart, Zap, Package } from 'lucide-react';
import { useSMSSettings } from '@/hooks/useSMSSettings';
import { ConfigSection } from '../shared/ConfigSection';
import { useTenant } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function SMSSettingsTab() {
  const { tenantId } = useTenant();
  const { settings, quota, templates, marketplaceItems, isLoading, saveSettings, saveTemplate, purchaseBundle } = useSMSSettings();
  
  const [provider, setProvider] = useState(settings?.provider || 'twilio');
  const [senderId, setSenderId] = useState(settings?.sender_id || '');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [enabled, setEnabled] = useState(settings?.enabled || false);
  const [autoBookingConfirm, setAutoBookingConfirm] = useState(settings?.auto_send_booking_confirmation || false);
  const [autoCheckinReminder, setAutoCheckinReminder] = useState(settings?.auto_send_checkin_reminder || false);
  const [autoCheckoutReminder, setAutoCheckoutReminder] = useState(settings?.auto_send_checkout_reminder || false);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('This is a test message from your hotel SMS system.');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [showTestDialog, setShowTestDialog] = useState(false);

  const handleSaveSettings = () => {
    saveSettings.mutate({
      provider,
      sender_id: senderId,
      api_key_encrypted: apiKey,
      api_secret_encrypted: apiSecret,
      enabled,
      auto_send_booking_confirmation: autoBookingConfirm,
      auto_send_checkin_reminder: autoCheckinReminder,
      auto_send_checkout_reminder: autoCheckoutReminder,
    });
  };

  const handleSendTestSMS = async () => {
    if (!testPhone || !testMessage) {
      toast.error('Please enter phone number and message');
      return;
    }

    setIsSendingTest(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          tenant_id: tenantId,
          to: testPhone,
          message: testMessage,
          event_key: 'manual_test',
        },
      });

      if (error) throw error;

      toast.success('Test SMS sent successfully!');
      setShowTestDialog(false);
      setTestPhone('');
    } catch (error: any) {
      console.error('Test SMS error:', error);
      toast.error(error.message || 'Failed to send test SMS');
    } finally {
      setIsSendingTest(false);
    }
  };

  const quotaUsagePercent = quota ? (quota.quota_used / quota.quota_total) * 100 : 0;
  const remainingCredits = quota ? quota.quota_total - quota.quota_used : 0;

  return (
    <div className="space-y-6">
      <Tabs defaultValue="provider" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="provider">Provider</TabsTrigger>
          <TabsTrigger value="quota">Quota & Usage</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
        </TabsList>

        <TabsContent value="provider" className="space-y-6">
          <ConfigSection
            title="SMS Provider Configuration"
            description="Configure your SMS provider to send automated notifications"
            icon={Settings}
          >
            <div className="space-y-4">
              <div>
                <Label>Provider</Label>
                <Select value={provider} onValueChange={setProvider}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="twilio">Twilio</SelectItem>
                    <SelectItem value="termii">Termii</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Sender ID / From Number</Label>
                <Input
                  value={senderId}
                  onChange={(e) => setSenderId(e.target.value)}
                  placeholder="+1234567890 or YourBrand"
                />
              </div>

              {provider === 'twilio' && (
                <>
                  <div>
                    <Label>Account SID</Label>
                    <Input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Enter Twilio Account SID"
                    />
                  </div>
                  <div>
                    <Label>Auth Token</Label>
                    <Input
                      type="password"
                      value={apiSecret}
                      onChange={(e) => setApiSecret(e.target.value)}
                      placeholder="Enter Twilio Auth Token"
                    />
                  </div>
                </>
              )}

              {provider === 'termii' && (
                <div>
                  <Label>API Key</Label>
                  <Input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter Termii API Key"
                  />
                </div>
              )}

              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable SMS Notifications</Label>
                    <p className="text-sm text-muted-foreground">Allow sending SMS messages</p>
                  </div>
                  <Switch checked={enabled} onCheckedChange={setEnabled} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Booking Confirmations</Label>
                    <p className="text-sm text-muted-foreground">Auto-send on successful booking</p>
                  </div>
                  <Switch checked={autoBookingConfirm} onCheckedChange={setAutoBookingConfirm} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Check-in Reminders</Label>
                    <p className="text-sm text-muted-foreground">Send reminder before check-in</p>
                  </div>
                  <Switch checked={autoCheckinReminder} onCheckedChange={setAutoCheckinReminder} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Checkout Reminders</Label>
                    <p className="text-sm text-muted-foreground">Send reminder on checkout day</p>
                  </div>
                  <Switch checked={autoCheckoutReminder} onCheckedChange={setAutoCheckoutReminder} />
                </div>
              </div>

              <div className="pt-4 border-t space-y-3">
                <h4 className="font-medium">Test SMS Configuration</h4>
                <p className="text-sm text-muted-foreground">
                  Send a test SMS to verify your configuration is working correctly.
                </p>
                
                <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full sm:w-auto">
                      <Send className="mr-2 h-4 w-4" />
                      Send Test SMS
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Send Test SMS</DialogTitle>
                      <DialogDescription>
                        Send a test message to verify your SMS configuration.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="test-phone">Phone Number</Label>
                        <Input
                          id="test-phone"
                          placeholder="+234XXXXXXXXXX"
                          value={testPhone}
                          onChange={(e) => setTestPhone(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="test-message">Message</Label>
                        <Textarea
                          id="test-message"
                          placeholder="Enter test message..."
                          value={testMessage}
                          onChange={(e) => setTestMessage(e.target.value)}
                          rows={4}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setShowTestDialog(false)}
                        disabled={isSendingTest}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleSendTestSMS} disabled={isSendingTest}>
                        {isSendingTest ? 'Sending...' : 'Send Test'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <Button onClick={handleSaveSettings} disabled={saveSettings.isPending}>
                {saveSettings.isPending ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </ConfigSection>
        </TabsContent>

        <TabsContent value="quota" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                SMS Quota & Usage
              </CardTitle>
              <CardDescription>Track your SMS credit consumption</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Credits Used</span>
                  <span className="text-sm text-muted-foreground">
                    {quota?.quota_used || 0} / {quota?.quota_total || 0}
                  </span>
                </div>
                <Progress value={quotaUsagePercent} className="h-2" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <p className="text-2xl font-bold">{remainingCredits}</p>
                  <p className="text-sm text-muted-foreground">Credits Remaining</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-2xl font-bold">{quota?.quota_used || 0}</p>
                  <p className="text-sm text-muted-foreground">Credits Used</p>
                </div>
              </div>

              {quota?.quota_reset_date && (
                <div className="text-sm text-muted-foreground">
                  Quota resets: {new Date(quota.quota_reset_date).toLocaleDateString()}
                </div>
              )}

              {quotaUsagePercent > 80 && (
                <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
                  <p className="font-medium">Low Credit Warning</p>
                  <p className="text-sm">You're running low on SMS credits. Consider purchasing more to avoid service interruption.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <ConfigSection
            title="SMS Templates"
            description="Customize your automated SMS messages"
            icon={MessageSquare}
          >
            <div className="space-y-4">
              {templates?.map((template) => (
                <TemplateEditor key={template.id} template={template} onSave={saveTemplate.mutate} />
              ))}
            </div>
          </ConfigSection>
        </TabsContent>

        <TabsContent value="marketplace" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                SMS Credit Bundles
              </CardTitle>
              <CardDescription>Purchase SMS credits for your account</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {marketplaceItems?.map((item) => (
                  <BundleCard
                    key={item.id}
                    item={item}
                    onPurchase={(paymentMethod, reference) => {
                      purchaseBundle.mutate({
                        marketplace_item_id: item.id,
                        payment_method: paymentMethod,
                        payment_reference: reference,
                      });
                    }}
                    isPurchasing={purchaseBundle.isPending}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TemplateEditor({ template, onSave }: any) {
  const [body, setBody] = useState(template.template_body);
  const [isActive, setIsActive] = useState(template.is_active);

  return (
    <div className="space-y-2 p-4 border rounded-lg">
      <div className="flex items-center justify-between">
        <Label className="capitalize">{template.event_key.replace(/_/g, ' ')}</Label>
        <Switch checked={isActive} onCheckedChange={setIsActive} />
      </div>
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="Enter SMS template..."
      />
      <p className="text-xs text-muted-foreground">
        Available variables: {'{'}guestName{'}'}, {'{'}hotelName{'}'}, {'{'}roomNumber{'}'}, {'{'}checkInDate{'}'}, {'{'}bookingReference{'}'}
      </p>
      <Button
        size="sm"
        onClick={() => onSave({ ...template, template_body: body, is_active: isActive })}
      >
        Save Template
      </Button>
    </div>
  );
}

function BundleCard({ item, onPurchase, isPurchasing }: any) {
  const [showDialog, setShowDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [reference, setReference] = useState('');

  const handlePurchase = () => {
    onPurchase(paymentMethod, reference);
    setShowDialog(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          {item.name}
        </CardTitle>
        <CardDescription>{item.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-3xl font-bold">{item.credits_amount}</p>
            <p className="text-sm text-muted-foreground">SMS Credits</p>
          </div>
          <Badge variant="secondary" className="text-lg">
            {item.currency} {item.price_amount.toLocaleString()}
          </Badge>
        </div>

        {item.validity_days && (
          <p className="text-sm text-muted-foreground">
            Valid for {item.validity_days} days
          </p>
        )}

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button className="w-full" disabled={isPurchasing}>
              Purchase Now
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Purchase {item.name}</DialogTitle>
              <DialogDescription>
                Complete payment to add {item.credits_amount} SMS credits to your account
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Payment Reference</Label>
                <Input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Enter payment reference"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handlePurchase} disabled={!reference}>
                Confirm Purchase
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
