import { useConfigStore } from '@/stores/configStore';
import { ConfigCard } from '../shared/ConfigCard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign } from 'lucide-react';
import { toast } from 'sonner';

const currencies = [
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
];

export function FinancialsTab() {
  const { financials, updateFinancials, saveFinancials, unsavedChanges, version } = useConfigStore();

  const handleChange = (field: string, value: any) => {
    updateFinancials({ [field]: value });
  };

  const handleSave = async () => {
    try {
      await saveFinancials();
      toast.success('Currency settings saved');
    } catch (error) {
      toast.error('Failed to save currency settings');
    }
  };

  const selectedCurrency = currencies.find(c => c.code === financials.currency) || currencies[0];

  return (
    <ConfigCard
      title="Currency & Display Settings"
      description="Configure how monetary values are displayed"
      icon={DollarSign}
      onSave={handleSave}
      hasUnsavedChanges={unsavedChanges.has('financials')}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select
              value={financials.currency || 'NGN'}
              onValueChange={(value) => {
                const curr = currencies.find(c => c.code === value);
                handleChange('currency', value);
                if (curr) handleChange('currency_symbol', curr.symbol);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
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
            <Label>Symbol Position</Label>
            <Select
              value={financials.symbol_position || 'before'}
              onValueChange={(value) => handleChange('symbol_position', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="before">Before (₦100.00)</SelectItem>
                <SelectItem value="after">After (100.00₦)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Decimal Separator</Label>
            <Input
              value={financials.decimal_separator || '.'}
              onChange={(e) => handleChange('decimal_separator', e.target.value)}
              maxLength={1}
            />
          </div>

          <div className="space-y-2">
            <Label>Thousand Separator</Label>
            <Input
              value={financials.thousand_separator || ','}
              onChange={(e) => handleChange('thousand_separator', e.target.value)}
              maxLength={1}
            />
          </div>

          <div className="space-y-2">
            <Label>Decimal Places</Label>
            <Input
              type="number"
              min="0"
              max="4"
              value={financials.decimal_places || 2}
              onChange={(e) => handleChange('decimal_places', parseInt(e.target.value))}
            />
          </div>
        </div>

        <div className="p-4 bg-muted rounded-lg">
          <Label className="text-sm font-medium mb-2 block">Live Preview</Label>
          <p className="text-2xl font-semibold text-foreground">
            {financials.symbol_position === 'after'
              ? `12${financials.thousand_separator || ','}345${financials.decimal_separator || '.'}${(67).toString().padStart(financials.decimal_places || 2, '0')} ${selectedCurrency.symbol}`
              : `${selectedCurrency.symbol} 12${financials.thousand_separator || ','}345${financials.decimal_separator || '.'}${(67).toString().padStart(financials.decimal_places || 2, '0')}`
            }
          </p>
        </div>
      </div>
    </ConfigCard>
  );
}
