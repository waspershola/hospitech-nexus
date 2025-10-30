import { usePaymentPreferences } from '@/hooks/usePaymentPreferences';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Info, Save } from 'lucide-react';
import { useState, useEffect } from 'react';

export function PaymentPreferencesTab() {
  const { preferences, isLoading, updatePreferences, isUpdating } = usePaymentPreferences();
  
  const [formData, setFormData] = useState({
    allow_checkout_with_debt: false,
    auto_apply_wallet_on_booking: true,
    overpayment_default_action: 'wallet' as 'wallet' | 'prompt' | 'refund',
    manager_approval_threshold: 50000,
    receivable_aging_days: 30,
    large_overpayment_threshold: 50000,
  });

  useEffect(() => {
    if (preferences) {
      setFormData({
        allow_checkout_with_debt: preferences.allow_checkout_with_debt,
        auto_apply_wallet_on_booking: preferences.auto_apply_wallet_on_booking,
        overpayment_default_action: preferences.overpayment_default_action,
        manager_approval_threshold: preferences.manager_approval_threshold,
        receivable_aging_days: preferences.receivable_aging_days,
        large_overpayment_threshold: preferences.large_overpayment_threshold,
      });
    }
  }, [preferences]);

  const handleSave = () => {
    updatePreferences(formData);
  };

  if (isLoading) {
    return <div className="p-6">Loading preferences...</div>;
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          These settings control payment behavior, approval thresholds, and receivables management across your hotel.
        </AlertDescription>
      </Alert>

      {/* Checkout Settings */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Checkout Settings</h3>
            <p className="text-sm text-muted-foreground">Control checkout behavior for guests with outstanding balances</p>
          </div>
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="allow-debt">Allow Checkout with Outstanding Balance</Label>
              <p className="text-sm text-muted-foreground">
                Guests can check out without settling their full balance (creates receivable)
              </p>
            </div>
            <Switch
              id="allow-debt"
              checked={formData.allow_checkout_with_debt}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, allow_checkout_with_debt: checked })
              }
            />
          </div>
        </div>
      </Card>

      {/* Wallet Settings */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Wallet Settings</h3>
            <p className="text-sm text-muted-foreground">Configure wallet credit behavior</p>
          </div>
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-apply">Auto-Apply Wallet Credit on Booking</Label>
              <p className="text-sm text-muted-foreground">
                Automatically suggest applying available wallet balance to new bookings
              </p>
            </div>
            <Switch
              id="auto-apply"
              checked={formData.auto_apply_wallet_on_booking}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, auto_apply_wallet_on_booking: checked })
              }
            />
          </div>
        </div>
      </Card>

      {/* Overpayment Settings */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Overpayment Handling</h3>
            <p className="text-sm text-muted-foreground">How to handle excess payments from guests</p>
          </div>
          <Separator />
          
          <div className="space-y-2">
            <Label htmlFor="overpayment-action">Default Overpayment Action</Label>
            <Select
              value={formData.overpayment_default_action}
              onValueChange={(value: 'wallet' | 'prompt' | 'refund') => 
                setFormData({ ...formData, overpayment_default_action: value })
              }
            >
              <SelectTrigger id="overpayment-action">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="wallet">Credit to Wallet (Recommended)</SelectItem>
                <SelectItem value="prompt">Prompt Staff to Choose</SelectItem>
                <SelectItem value="refund">Process Refund</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Staff can override this choice at payment time
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="overpayment-threshold">Large Overpayment Threshold (₦)</Label>
            <Input
              id="overpayment-threshold"
              type="number"
              value={formData.large_overpayment_threshold}
              onChange={(e) => 
                setFormData({ ...formData, large_overpayment_threshold: Number(e.target.value) })
              }
              min={0}
              step={1000}
            />
            <p className="text-xs text-muted-foreground">
              Overpayments above this amount require manager approval
            </p>
          </div>
        </div>
      </Card>

      {/* Approval Thresholds */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Approval Thresholds</h3>
            <p className="text-sm text-muted-foreground">Set amounts that require manager approval</p>
          </div>
          <Separator />
          
          <div className="space-y-2">
            <Label htmlFor="manager-threshold">Manager Approval Threshold (₦)</Label>
            <Input
              id="manager-threshold"
              type="number"
              value={formData.manager_approval_threshold}
              onChange={(e) => 
                setFormData({ ...formData, manager_approval_threshold: Number(e.target.value) })
              }
              min={0}
              step={1000}
            />
            <p className="text-xs text-muted-foreground">
              Partial payments with balance due above this amount require manager approval
            </p>
          </div>
        </div>
      </Card>

      {/* Receivables Settings */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Receivables Management</h3>
            <p className="text-sm text-muted-foreground">Configure accounts receivable aging and alerts</p>
          </div>
          <Separator />
          
          <div className="space-y-2">
            <Label htmlFor="aging-days">Receivable Aging Alert (Days)</Label>
            <Input
              id="aging-days"
              type="number"
              value={formData.receivable_aging_days}
              onChange={(e) => 
                setFormData({ ...formData, receivable_aging_days: Number(e.target.value) })
              }
              min={1}
              max={365}
            />
            <p className="text-xs text-muted-foreground">
              Alert when receivables are older than this many days
            </p>
          </div>
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isUpdating}>
          <Save className="w-4 h-4 mr-2" />
          {isUpdating ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  );
}