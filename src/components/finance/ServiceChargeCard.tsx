import { useState, useEffect } from 'react';
import { useFinanceSettings } from '@/hooks/useFinanceSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Utensils, Save } from 'lucide-react';
import { calculateTaxForAmount } from '@/lib/finance/tax';

export function ServiceChargeCard() {
  const { settings, updateSettings, isUpdating } = useFinanceSettings();
  const [localSettings, setLocalSettings] = useState({
    service_charge: settings?.service_charge || 0,
    service_charge_inclusive: settings?.service_charge_inclusive || false,
  });
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settings) {
      setLocalSettings({
        service_charge: settings.service_charge || 0,
        service_charge_inclusive: settings.service_charge_inclusive || false,
      });
    }
  }, [settings]);

  const handleChange = (field: string, value: any) => {
    if (field === 'service_charge') {
      const numValue = parseFloat(value) || 0;
      if (numValue >= 0 && numValue <= 100) {
        setLocalSettings(prev => ({ ...prev, [field]: numValue }));
        setHasChanges(true);
      }
    } else {
      setLocalSettings(prev => ({ ...prev, [field]: value }));
      setHasChanges(true);
    }
  };

  const handleSave = () => {
    updateSettings(localSettings);
    setHasChanges(false);
  };

  const sampleAmount = 10000;
  const serviceAmount = sampleAmount * (localSettings.service_charge / 100);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Utensils className="h-5 w-5 text-primary" />
            <CardTitle>Service Charge Configuration</CardTitle>
          </div>
          {hasChanges && (
            <Badge variant="secondary" className="gap-1">
              <div className="w-2 h-2 bg-warning rounded-full animate-pulse" />
              Unsaved
            </Badge>
          )}
        </div>
        <CardDescription>
          Configure service charge for hospitality services
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="service_charge">Service Charge (%)</Label>
            <Input
              id="service_charge"
              type="number"
              value={localSettings.service_charge}
              onChange={(e) => handleChange('service_charge', e.target.value)}
              min={0}
              max={100}
              step={0.01}
              placeholder="10"
            />
            <p className="text-xs text-muted-foreground">
              Enter the service charge percentage (0-100)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="service_charge_inclusive" className="flex items-center gap-2">
              Service Charge Inclusive Pricing
            </Label>
            <div className="flex items-center gap-3 mt-2">
              <Switch
                id="service_charge_inclusive"
                checked={localSettings.service_charge_inclusive}
                onCheckedChange={(checked) => handleChange('service_charge_inclusive', checked)}
              />
              <span className="text-sm text-muted-foreground">
                {localSettings.service_charge_inclusive ? 'Prices include service charge' : 'Service charge added to prices'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {localSettings.service_charge_inclusive 
                ? 'Service charge is included in displayed prices' 
                : 'Service charge will be added on top of displayed prices'}
            </p>
          </div>
        </div>

        {/* Live Preview */}
        <div className="p-4 bg-muted/50 rounded-lg border space-y-2">
          <h4 className="text-sm font-medium">Calculation Preview</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Base Amount:</span>
              <span className="font-medium">₦{sampleAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Service Charge ({localSettings.service_charge}%):</span>
              <span className="font-medium">₦{serviceAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="font-semibold">Total:</span>
              <span className="font-semibold">
                ₦{(localSettings.service_charge_inclusive ? sampleAmount : sampleAmount + serviceAmount).toLocaleString()}
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {localSettings.service_charge_inclusive 
              ? `Customer pays ₦${sampleAmount.toLocaleString()} (Service charge of ₦${serviceAmount.toLocaleString()} included)`
              : `Customer pays ₦${(sampleAmount + serviceAmount).toLocaleString()} (₦${sampleAmount.toLocaleString()} + ₦${serviceAmount.toLocaleString()} service charge)`
            }
          </p>
        </div>

        <div className="flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || isUpdating}
            className="gap-2"
          >
            {isUpdating ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Service Charge Settings
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
