import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Printer, Eye } from 'lucide-react';
import { useReceiptSettings } from '@/hooks/useReceiptSettings';
import { useFinanceLocations } from '@/hooks/useFinanceLocations';
import { ReceiptPreview } from './components/ReceiptPreview';

export function ReceiptSettingsTab() {
  const { locations } = useFinanceLocations();
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const { settings, upsertSettings } = useReceiptSettings(selectedLocationId || undefined);
  const [showPreview, setShowPreview] = useState(false);

  const currentSettings = settings?.[0];

  const handleUpdate = (updates: any) => {
    upsertSettings({
      ...currentSettings,
      location_id: selectedLocationId,
      ...updates,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-semibold mb-2">Receipt Settings</h2>
        <p className="text-muted-foreground">
          Configure receipt printing for different locations and paper sizes
        </p>
      </div>

      {/* Location Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Location</CardTitle>
          <CardDescription>Configure receipts per location (Front Desk, Restaurant, Bar, etc.)</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedLocationId || ''} onValueChange={setSelectedLocationId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default (All Locations)</SelectItem>
              {locations?.map(loc => (
                <SelectItem key={loc.id} value={loc.id}>
                  {loc.name} - {loc.department}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Paper & Printer Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Paper & Printer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Paper Size</Label>
              <Select 
                value={currentSettings?.paper_size || '80mm'}
                onValueChange={(value) => handleUpdate({ paper_size: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="58mm">58mm (Small Thermal)</SelectItem>
                  <SelectItem value="80mm">80mm (Standard Thermal)</SelectItem>
                  <SelectItem value="A5">A5 (Half Letter)</SelectItem>
                  <SelectItem value="A4">A4 (Full Letter)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Printer Name</Label>
              <Input 
                placeholder="e.g., Epson TM-T88VI"
                value={currentSettings?.printer_name || ''}
                onChange={(e) => handleUpdate({ printer_name: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Printer Endpoint (Optional)</Label>
            <Input 
              placeholder="e.g., http://192.168.1.100:9100 or COM3"
              value={currentSettings?.printer_endpoint || ''}
              onChange={(e) => handleUpdate({ printer_endpoint: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Network printer URL or local device name
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Content Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Receipt Content</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Header Text</Label>
            <Textarea 
              placeholder="Welcome to The Haven Hotel"
              value={currentSettings?.header_text || ''}
              onChange={(e) => handleUpdate({ header_text: e.target.value })}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Footer Text</Label>
            <Textarea 
              placeholder="Thank you for your business!"
              value={currentSettings?.footer_text || ''}
              onChange={(e) => handleUpdate({ footer_text: e.target.value })}
              rows={2}
            />
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Show VAT Breakdown</Label>
              <Switch 
                checked={currentSettings?.show_vat_breakdown ?? true}
                onCheckedChange={(checked) => handleUpdate({ show_vat_breakdown: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Include Service Charge</Label>
              <Switch 
                checked={currentSettings?.include_service_charge ?? true}
                onCheckedChange={(checked) => handleUpdate({ include_service_charge: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Show Provider Fee</Label>
              <Switch 
                checked={currentSettings?.show_provider_fee ?? true}
                onCheckedChange={(checked) => handleUpdate({ show_provider_fee: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Show QR Code</Label>
              <Switch 
                checked={currentSettings?.show_qr_code ?? false}
                onCheckedChange={(checked) => handleUpdate({ show_qr_code: checked })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Receipt Numbering */}
      <Card>
        <CardHeader>
          <CardTitle>Receipt Numbering</CardTitle>
          <CardDescription>Configure how receipt numbers are generated</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Number Prefix</Label>
              <Input 
                placeholder="e.g., RCP, INV, RCPT"
                value={currentSettings?.receipt_number_prefix || 'RCP'}
                onChange={(e) => handleUpdate({ receipt_number_prefix: e.target.value.toUpperCase() })}
                maxLength={10}
              />
              <p className="text-xs text-muted-foreground">
                Appears before the number (e.g., RCP-2025-000001)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Number Length</Label>
              <Input 
                type="number"
                min={4}
                max={10}
                value={currentSettings?.receipt_number_length || 6}
                onChange={(e) => handleUpdate({ receipt_number_length: parseInt(e.target.value) || 6 })}
              />
              <p className="text-xs text-muted-foreground">
                Number of digits (e.g., 6 = 000001)
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Reset Sequence Yearly</Label>
              <p className="text-xs text-muted-foreground">
                Start numbering from 1 each new year
              </p>
            </div>
            <Switch 
              checked={currentSettings?.reset_sequence_yearly ?? true}
              onCheckedChange={(checked) => handleUpdate({ reset_sequence_yearly: checked })}
            />
          </div>

          <div className="p-3 bg-muted rounded-md">
            <p className="text-sm font-medium mb-1">Preview:</p>
            <p className="text-xs font-mono">
              {currentSettings?.receipt_number_prefix || 'RCP'}-
              {new Date().getFullYear()}-
              {'0'.repeat(currentSettings?.receipt_number_length || 6)}1
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Auto-Print Settings - Legacy */}
      <Card>
        <CardHeader>
          <CardTitle>Print Control</CardTitle>
          <CardDescription>
            💡 Print receipts are now controlled per-action with toggles in checkout and payment drawers.
            The auto-print settings below are being phased out.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <p className="text-sm font-medium">✨ New Feature: Per-Action Print Control</p>
            <p className="text-xs text-muted-foreground">
              Users can now choose whether to print receipts when performing checkouts or recording payments using the toggle switches in each drawer.
              This gives you more control and avoids unnecessary printing.
            </p>
          </div>

          <Separator />

          <div className="flex items-center justify-between opacity-60">
            <div>
              <Label>Auto-print on Checkout (Legacy)</Label>
              <p className="text-xs text-muted-foreground">
                Replaced by per-action toggle in Room Action Drawer
              </p>
            </div>
            <Switch 
              checked={currentSettings?.auto_print_on_checkout ?? false}
              onCheckedChange={(checked) => handleUpdate({ auto_print_on_checkout: checked })}
              disabled
            />
          </div>

          <div className="flex items-center justify-between opacity-60">
            <div>
              <Label>Auto-print on Payment (Legacy)</Label>
              <p className="text-xs text-muted-foreground">
                Replaced by per-action toggle in Payment Form
              </p>
            </div>
            <Switch 
              checked={currentSettings?.auto_print_on_payment ?? false}
              onCheckedChange={(checked) => handleUpdate({ auto_print_on_payment: checked })}
              disabled
            />
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button onClick={() => setShowPreview(true)}>
          <Eye className="w-4 h-4 mr-2" />
          Preview Receipt
        </Button>
        <Button variant="outline">
          <Printer className="w-4 h-4 mr-2" />
          Test Print
        </Button>
      </div>

      {/* Preview Dialog */}
      {showPreview && (
        <ReceiptPreview 
          settings={currentSettings}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
