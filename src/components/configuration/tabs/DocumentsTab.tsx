import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ConfigCard } from '../shared/ConfigCard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText } from 'lucide-react';
import { toast } from 'sonner';

export function DocumentsTab() {
  const { tenantId } = useAuth();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, [tenantId]);

  const loadTemplates = async () => {
    if (!tenantId) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('document_templates')
      .select('*')
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('Failed to load templates:', error);
    } else {
      setTemplates(data || []);
    }
    setLoading(false);
  };

  const updateTemplate = async (templateType: string, updates: any) => {
    if (!tenantId) return;

    const { error } = await supabase
      .from('document_templates')
      .upsert({
        tenant_id: tenantId,
        template_type: templateType,
        ...updates,
      });

    if (error) {
      toast.error('Failed to update template');
    } else {
      toast.success('Template updated');
      loadTemplates();
    }
  };

  const getTemplate = (type: string) => {
    return templates.find(t => t.template_type === type) || {};
  };

  if (loading) {
    return <div className="text-center py-8">Loading templates...</div>;
  }

  return (
    <div className="space-y-6">
      <ConfigCard
        title="Invoice Configuration"
        description="Customize invoice numbering and format"
        icon={FileText}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Prefix</Label>
              <Input
                value={getTemplate('invoice').prefix || 'INV-'}
                onChange={(e) => updateTemplate('invoice', { prefix: e.target.value })}
                placeholder="INV-"
              />
            </div>

            <div className="space-y-2">
              <Label>Next Number</Label>
              <Input
                type="number"
                min="1"
                value={getTemplate('invoice').next_number || 1}
                onChange={(e) => updateTemplate('invoice', { next_number: parseInt(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label>Number Length</Label>
              <Input
                type="number"
                min="4"
                max="10"
                value={getTemplate('invoice').number_length || 6}
                onChange={(e) => updateTemplate('invoice', { number_length: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="invoice_qr"
                checked={getTemplate('invoice').include_qr !== false}
                onCheckedChange={(checked) => updateTemplate('invoice', { include_qr: checked })}
              />
              <Label htmlFor="invoice_qr" className="cursor-pointer">Include QR Code</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="invoice_signature"
                checked={getTemplate('invoice').include_signature || false}
                onCheckedChange={(checked) => updateTemplate('invoice', { include_signature: checked })}
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
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Prefix</Label>
              <Input
                value={getTemplate('receipt').prefix || 'RCP-'}
                onChange={(e) => updateTemplate('receipt', { prefix: e.target.value })}
                placeholder="RCP-"
              />
            </div>

            <div className="space-y-2">
              <Label>Format</Label>
              <Select
                value={getTemplate('receipt').format || 'A4'}
                onValueChange={(value) => updateTemplate('receipt', { format: value })}
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
                checked={getTemplate('receipt').include_qr !== false}
                onCheckedChange={(checked) => updateTemplate('receipt', { include_qr: checked })}
              />
              <Label htmlFor="receipt_qr" className="cursor-pointer">QR Code</Label>
            </div>
          </div>
        </div>
      </ConfigCard>
    </div>
  );
}
