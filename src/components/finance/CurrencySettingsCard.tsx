import { useState, useEffect } from 'react';
import { useFinanceSettings } from '@/hooks/useFinanceSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Save, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '@/lib/finance/tax';

const currencies = [
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
];

export function CurrencySettingsCard() {
  const { settings, updateSettings, isUpdating } = useFinanceSettings();
  const [localSettings, setLocalSettings] = useState({
    currency: settings?.currency || 'NGN',
    currency_symbol: settings?.currency_symbol || '₦',
    symbol_position: settings?.symbol_position || 'before',
    decimal_separator: settings?.decimal_separator || '.',
    thousand_separator: settings?.thousand_separator || ',',
    decimal_places: settings?.decimal_places || 2,
  });
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settings) {
      setLocalSettings({
        currency: settings.currency || 'NGN',
        currency_symbol: settings.currency_symbol || '₦',
        symbol_position: settings.symbol_position || 'before',
        decimal_separator: settings.decimal_separator || '.',
        thousand_separator: settings.thousand_separator || ',',
        decimal_places: settings.decimal_places || 2,
      });
    }
  }, [settings]);

  const handleChange = (field: string, value: any) => {
    setLocalSettings(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleCurrencyChange = (code: string) => {
    const currency = currencies.find(c => c.code === code);
    if (currency) {
      setLocalSettings(prev => ({
        ...prev,
        currency: code,
        currency_symbol: currency.symbol,
      }));
      setHasChanges(true);
    }
  };

  const handleSave = () => {
    updateSettings(localSettings);
    setHasChanges(false);
  };

  const previewAmount = 12345.67;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <CardTitle>Currency & Display Settings</CardTitle>
          </div>
          {hasChanges && (
            <Badge variant="secondary" className="gap-1">
              <div className="w-2 h-2 bg-warning rounded-full animate-pulse" />
              Unsaved
            </Badge>
          )}
        </div>
        <CardDescription>
          Configure how monetary values are displayed throughout the system
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select value={localSettings.currency} onValueChange={handleCurrencyChange}>
              <SelectTrigger id="currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((curr) => (
                  <SelectItem key={curr.code} value={curr.code}>
                    {curr.symbol} - {curr.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="symbol_position">Symbol Position</Label>
            <Select 
              value={localSettings.symbol_position} 
              onValueChange={(value) => handleChange('symbol_position', value)}
            >
              <SelectTrigger id="symbol_position">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="before">Before Amount</SelectItem>
                <SelectItem value="after">After Amount</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="decimal_separator">Decimal Separator</Label>
            <Input
              id="decimal_separator"
              value={localSettings.decimal_separator}
              onChange={(e) => handleChange('decimal_separator', e.target.value)}
              maxLength={1}
              placeholder="."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="thousand_separator">Thousand Separator</Label>
            <Input
              id="thousand_separator"
              value={localSettings.thousand_separator}
              onChange={(e) => handleChange('thousand_separator', e.target.value)}
              maxLength={1}
              placeholder=","
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="decimal_places">Decimal Places</Label>
            <Input
              id="decimal_places"
              type="number"
              value={localSettings.decimal_places}
              onChange={(e) => handleChange('decimal_places', parseInt(e.target.value) || 0)}
              min={0}
              max={4}
            />
          </div>
        </div>

        {/* Live Preview */}
        <div className="p-4 bg-muted/50 rounded-lg border">
          <h4 className="text-sm font-medium mb-2">Preview</h4>
          <div className="text-2xl font-semibold">
            {formatCurrency(previewAmount, {
              currency: localSettings.currency,
              currency_symbol: localSettings.currency_symbol,
              symbol_position: localSettings.symbol_position as 'before' | 'after',
              decimal_separator: localSettings.decimal_separator,
              thousand_separator: localSettings.thousand_separator,
              decimal_places: localSettings.decimal_places,
            } as any)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Sample amount: {previewAmount}
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
                Save Currency Settings
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
