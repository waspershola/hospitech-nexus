import { useConfigStore } from '@/stores/configStore';
import { ConfigCard } from '../shared/ConfigCard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText } from 'lucide-react';
import { toast } from 'sonner';

export function DocumentsTab() {
  const { documentTemplates, updateDocumentTemplate, saveDocumentTemplate, unsavedChanges, version } = useConfigStore();

  const getTemplate = (type: string) => {
    return documentTemplates.find(t => t.template_type === type) || {};
  };

  const handleTemplateChange = (templateType: string, field: string, value: any) => {
    const template = getTemplate(templateType);
    updateDocumentTemplate(templateType, { ...template, [field]: value });
  };

  const handleSaveInvoice = async () => {
    try {
      await saveDocumentTemplate('invoice');
      toast.success('Invoice template saved');
    } catch (error) {
      toast.error('Failed to save invoice template');
    }
  };

  const handleSaveReceipt = async () => {
    try {
      await saveDocumentTemplate('receipt');
      toast.success('Receipt template saved');
    } catch (error) {
      toast.error('Failed to save receipt template');
    }
  };

  const invoiceTemplate = getTemplate('invoice');
  const receiptTemplate = getTemplate('receipt');

  return (
    <div className="space-y-6">
      <ConfigCard
        title="Invoice Configuration"
        description="Customize invoice numbering and format"
        icon={FileText}
        onSave={handleSaveInvoice}
        hasUnsavedChanges={unsavedChanges.has('template_invoice')}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Prefix</Label>
              <Input
                value={invoiceTemplate.prefix || 'INV-'}
                onChange={(e) => handleTemplateChange('invoice', 'prefix', e.target.value)}
                placeholder="INV-"
              />
            </div>

            <div className="space-y-2">
              <Label>Next Number</Label>
              <Input
                type="number"
                min="1"
                value={invoiceTemplate.next_number || 1}
                onChange={(e) => handleTemplateChange('invoice', 'next_number', parseInt(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label>Number Length</Label>
              <Input
                type="number"
                min="4"
                max="10"
                value={invoiceTemplate.number_length || 6}
                onChange={(e) => handleTemplateChange('invoice', 'number_length', parseInt(e.target.value))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="invoice_qr"
                checked={invoiceTemplate.include_qr !== false}
                onCheckedChange={(checked) => handleTemplateChange('invoice', 'include_qr', checked)}
              />
              <Label htmlFor="invoice_qr" className="cursor-pointer">Include QR Code</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="invoice_signature"
                checked={invoiceTemplate.include_signature || false}
                onCheckedChange={(checked) => handleTemplateChange('invoice', 'include_signature', checked)}
              />
              <Label htmlFor="invoice_signature" className="cursor-pointer">Include Signature Line</Label>
            </div>
          </div>
        </div>
      </ConfigCard>

      <ConfigCard
        title="Receipt Configuration"
        description="Customize receipt numbering and format"
        icon={FileText}
        onSave={handleSaveReceipt}
        hasUnsavedChanges={unsavedChanges.has('template_receipt')}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Prefix</Label>
              <Input
                value={receiptTemplate.prefix || 'RCP-'}
                onChange={(e) => handleTemplateChange('receipt', 'prefix', e.target.value)}
                placeholder="RCP-"
              />
            </div>

            <div className="space-y-2">
              <Label>Format</Label>
              <Select
                value={receiptTemplate.format || 'A4'}
                onValueChange={(value) => handleTemplateChange('receipt', 'format', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A4">A4 (210mm × 297mm)</SelectItem>
                  <SelectItem value="80mm">80mm Thermal</SelectItem>
                  <SelectItem value="58mm">58mm Thermal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2 self-end">
              <Switch
                id="receipt_qr"
                checked={receiptTemplate.include_qr !== false}
                onCheckedChange={(checked) => handleTemplateChange('receipt', 'include_qr', checked)}
              />
              <Label htmlFor="receipt_qr" className="cursor-pointer">QR Code</Label>
            </div>
          </div>
        </div>
      </ConfigCard>
    </div>
  );
}
