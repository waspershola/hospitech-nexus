import { useState, useEffect } from 'react';
import { useFinanceSettings } from '@/hooks/useFinanceSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Utensils, Save } from 'lucide-react';
import { calculateTaxForAmount } from '@/lib/finance/tax';

export function ServiceChargeCard() {
  const { settings, updateSettings, isUpdating } = useFinanceSettings();
  const [localSettings, setLocalSettings] = useState<{
    service_charge: number;
    service_charge_inclusive: boolean;
    rounding: 'round' | 'floor' | 'ceil';
  }>({
    service_charge: settings?.service_charge || 0,
    service_charge_inclusive: settings?.service_charge_inclusive || false,
    rounding: (settings?.rounding as 'round' | 'floor' | 'ceil') || 'round',
  });
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settings) {
      setLocalSettings({
        service_charge: settings.service_charge || 0,
        service_charge_inclusive: settings.service_charge_inclusive || false,
        rounding: (settings.rounding as 'round' | 'floor' | 'ceil') || 'round',
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

  // Helper function to apply rounding
  const roundMoney = (value: number, method: 'round' | 'floor' | 'ceil') => {
    const cents = value * 100;
    if (method === 'round') return Math.round(cents) / 100;
    if (method === 'floor') return Math.floor(cents) / 100;
    return Math.ceil(cents) / 100;
  };

  const sampleAmount = 10000;

  // Calculate based on inclusive/exclusive setting
  let baseAmount: number;
  let serviceAmount: number;

  if (localSettings.service_charge_inclusive) {
    // INCLUSIVE: Extract service charge from sampleAmount
    serviceAmount = roundMoney(sampleAmount * (localSettings.service_charge / (100 + localSettings.service_charge)), localSettings.rounding);
    baseAmount = roundMoney(sampleAmount - serviceAmount, localSettings.rounding);
  } else {
    // EXCLUSIVE: Add service charge to sampleAmount
    baseAmount = sampleAmount;
    serviceAmount = roundMoney(sampleAmount * (localSettings.service_charge / 100), localSettings.rounding);
  }

  const totalAmount = roundMoney(baseAmount + serviceAmount, localSettings.rounding);

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

          <div className="space-y-2">
            <Label htmlFor="rounding_service">Rounding Method</Label>
            <Select
              value={localSettings.rounding}
              onValueChange={(value) => handleChange('rounding', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="round">Round (Default)</SelectItem>
                <SelectItem value="floor">Round Down (Floor)</SelectItem>
                <SelectItem value="ceil">Round Up (Ceil)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              How to handle decimal amounts in calculations
            </p>
          </div>
        </div>

        {/* Live Preview */}
        <div className="p-4 bg-muted/50 rounded-lg border space-y-2">
          <h4 className="text-sm font-medium">Calculation Preview</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {localSettings.service_charge_inclusive ? 'Base Amount (before service charge):' : 'Base Amount:'}
              </span>
              <span className="font-medium">₦{baseAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Service Charge ({localSettings.service_charge}%):</span>
              <span className="font-medium">₦{serviceAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="font-semibold">Total:</span>
              <span className="font-semibold">₦{totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {localSettings.service_charge_inclusive 
              ? `If customer pays ₦${sampleAmount.toLocaleString()}, service charge of ₦${serviceAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} is already included (base was ₦${baseAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})})`
              : `For a base of ₦${baseAmount.toLocaleString()}, customer pays ₦${totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} (₦${baseAmount.toLocaleString()} + ₦${serviceAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} service charge)`
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
