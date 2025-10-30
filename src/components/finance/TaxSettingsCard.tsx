import { useState, useEffect } from 'react';
import { useFinanceSettings } from '@/hooks/useFinanceSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Percent, Save } from 'lucide-react';
import { calculateTaxForAmount } from '@/lib/finance/tax';

export function TaxSettingsCard() {
  const { settings, updateSettings, isUpdating } = useFinanceSettings();
  const [localSettings, setLocalSettings] = useState({
    vat_rate: settings?.vat_rate || 0,
    vat_inclusive: settings?.vat_inclusive || false,
  });
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settings) {
      setLocalSettings({
        vat_rate: settings.vat_rate || 0,
        vat_inclusive: settings.vat_inclusive || false,
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

  const sampleAmount = 10000;
  const taxAmount = sampleAmount * (localSettings.vat_rate / 100);

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
              <span className="text-muted-foreground">VAT ({localSettings.vat_rate}%):</span>
              <span className="font-medium">₦{taxAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="font-semibold">Total:</span>
              <span className="font-semibold">
                ₦{(localSettings.vat_inclusive ? sampleAmount : sampleAmount + taxAmount).toLocaleString()}
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {localSettings.vat_inclusive 
              ? `Customer pays ₦${sampleAmount.toLocaleString()} (VAT of ₦${taxAmount.toLocaleString()} included)`
              : `Customer pays ₦${(sampleAmount + taxAmount).toLocaleString()} (₦${sampleAmount.toLocaleString()} + ₦${taxAmount.toLocaleString()} VAT)`
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
