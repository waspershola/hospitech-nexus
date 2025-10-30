import { useState, useEffect } from 'react';
import { useFinanceSettings } from '@/hooks/useFinanceSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Percent, Save } from 'lucide-react';
import { calculateTaxForAmount } from '@/lib/finance/tax';

export function TaxSettingsCard() {
  const { settings, updateSettings, isUpdating } = useFinanceSettings();
  const [localSettings, setLocalSettings] = useState<{
    vat_rate: number;
    vat_inclusive: boolean;
    vat_applied_on: 'base' | 'subtotal';
    rounding: 'round' | 'floor' | 'ceil';
  }>({
    vat_rate: settings?.vat_rate || 0,
    vat_inclusive: settings?.vat_inclusive || false,
    vat_applied_on: (settings?.vat_applied_on as 'base' | 'subtotal') || 'subtotal',
    rounding: (settings?.rounding as 'round' | 'floor' | 'ceil') || 'round',
  });
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settings) {
      setLocalSettings({
        vat_rate: settings.vat_rate || 0,
        vat_inclusive: settings.vat_inclusive || false,
        vat_applied_on: (settings.vat_applied_on as 'base' | 'subtotal') || 'subtotal',
        rounding: (settings.rounding as 'round' | 'floor' | 'ceil') || 'round',
      });
    }
  }, [settings]);

  const handleChange = (field: string, value: any) => {
    if (field === 'vat_rate') {
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
  let taxAmount: number;

  if (localSettings.vat_inclusive) {
    // INCLUSIVE: Extract VAT from sampleAmount
    taxAmount = roundMoney(sampleAmount * (localSettings.vat_rate / (100 + localSettings.vat_rate)), localSettings.rounding);
    baseAmount = roundMoney(sampleAmount - taxAmount, localSettings.rounding);
  } else {
    // EXCLUSIVE: Add VAT to sampleAmount
    baseAmount = sampleAmount;
    taxAmount = roundMoney(sampleAmount * (localSettings.vat_rate / 100), localSettings.rounding);
  }

  const totalAmount = roundMoney(baseAmount + taxAmount, localSettings.rounding);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Percent className="h-5 w-5 text-primary" />
            <CardTitle>VAT Configuration</CardTitle>
          </div>
          {hasChanges && (
            <Badge variant="secondary" className="gap-1">
              <div className="w-2 h-2 bg-warning rounded-full animate-pulse" />
              Unsaved
            </Badge>
          )}
        </div>
        <CardDescription>
          Configure Value Added Tax (VAT) for all transactions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="vat_rate">VAT Rate (%)</Label>
            <Input
              id="vat_rate"
              type="number"
              value={localSettings.vat_rate}
              onChange={(e) => handleChange('vat_rate', e.target.value)}
              min={0}
              max={100}
              step={0.01}
              placeholder="7.5"
            />
            <p className="text-xs text-muted-foreground">
              Enter the VAT percentage (0-100)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vat_inclusive" className="flex items-center gap-2">
              VAT Inclusive Pricing
            </Label>
            <div className="flex items-center gap-3 mt-2">
              <Switch
                id="vat_inclusive"
                checked={localSettings.vat_inclusive}
                onCheckedChange={(checked) => handleChange('vat_inclusive', checked)}
              />
              <span className="text-sm text-muted-foreground">
                {localSettings.vat_inclusive ? 'Prices include VAT' : 'VAT added to prices'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {localSettings.vat_inclusive 
                ? 'VAT is included in displayed prices' 
                : 'VAT will be added on top of displayed prices'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vat_applied_on">VAT Applied On</Label>
            <RadioGroup
              value={localSettings.vat_applied_on}
              onValueChange={(value) => handleChange('vat_applied_on', value)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="base" id="vat-base" />
                <Label htmlFor="vat-base" className="font-normal cursor-pointer">
                  Base Amount Only
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="subtotal" id="vat-subtotal" />
                <Label htmlFor="vat-subtotal" className="font-normal cursor-pointer">
                  Subtotal (Base + Service Charge)
                </Label>
              </div>
            </RadioGroup>
            <p className="text-xs text-muted-foreground">
              {localSettings.vat_applied_on === 'base' 
                ? 'VAT calculated on room rate only' 
                : 'VAT calculated on room rate + service charge'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rounding">Rounding Method</Label>
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
                {localSettings.vat_inclusive ? 'Base Amount (before VAT):' : 'Base Amount:'}
              </span>
              <span className="font-medium">₦{baseAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">VAT ({localSettings.vat_rate}%):</span>
              <span className="font-medium">₦{taxAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="font-semibold">Total:</span>
              <span className="font-semibold">₦{totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {localSettings.vat_inclusive 
              ? `If customer pays ₦${sampleAmount.toLocaleString()}, VAT of ₦${taxAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} is already included (base was ₦${baseAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})})`
              : `For a base of ₦${baseAmount.toLocaleString()}, customer pays ₦${totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} (₦${baseAmount.toLocaleString()} + ₦${taxAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} VAT)`
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
                Save VAT Settings
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
