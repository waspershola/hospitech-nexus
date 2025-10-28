import { useConfigStore } from '@/stores/configStore';
import { ConfigCard } from '../shared/ConfigCard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Palette } from 'lucide-react';
import { useAutoSave } from '@/hooks/useAutoSave';

export function BrandingTab() {
  const { branding, updateBranding, saveBranding } = useConfigStore();

  const handleChange = (field: string, value: any) => {
    updateBranding({ [field]: value });
  };

  useAutoSave(saveBranding, branding);

  return (
    <div className="space-y-6">
      <ConfigCard
        title="Brand Colors"
        description="Define your hotel's color identity"
        icon={Palette}
      >
        <div className="grid grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label htmlFor="primary_color">Primary Color</Label>
            <div className="flex gap-2">
              <Input
                id="primary_color"
                type="color"
                value={branding.primary_color || '#D32F2F'}
                onChange={(e) => handleChange('primary_color', e.target.value)}
                className="w-16 h-10 p-1 cursor-pointer"
              />
              <Input
                value={branding.primary_color || '#D32F2F'}
                onChange={(e) => handleChange('primary_color', e.target.value)}
                placeholder="#D32F2F"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="secondary_color">Secondary Color</Label>
            <div className="flex gap-2">
              <Input
                id="secondary_color"
                type="color"
                value={branding.secondary_color || '#FFD700'}
                onChange={(e) => handleChange('secondary_color', e.target.value)}
                className="w-16 h-10 p-1 cursor-pointer"
              />
              <Input
                value={branding.secondary_color || '#FFD700'}
                onChange={(e) => handleChange('secondary_color', e.target.value)}
                placeholder="#FFD700"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="accent_color">Accent Color</Label>
            <div className="flex gap-2">
              <Input
                id="accent_color"
                type="color"
                value={branding.accent_color || '#F4E5A1'}
                onChange={(e) => handleChange('accent_color', e.target.value)}
                className="w-16 h-10 p-1 cursor-pointer"
              />
              <Input
                value={branding.accent_color || '#F4E5A1'}
                onChange={(e) => handleChange('accent_color', e.target.value)}
                placeholder="#F4E5A1"
              />
            </div>
          </div>
        </div>
      </ConfigCard>

      <ConfigCard
        title="Typography"
        description="Font selections for headings and body text"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="font_heading">Heading Font</Label>
            <Input
              id="font_heading"
              value={branding.font_heading || 'Playfair Display'}
              onChange={(e) => handleChange('font_heading', e.target.value)}
              placeholder="Playfair Display"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="font_body">Body Font</Label>
            <Input
              id="font_body"
              value={branding.font_body || 'Inter'}
              onChange={(e) => handleChange('font_body', e.target.value)}
              placeholder="Inter"
            />
          </div>
        </div>
      </ConfigCard>

      <ConfigCard
        title="Receipt Customization"
        description="Header and footer text for printed documents"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="receipt_header">Receipt Header</Label>
            <Textarea
              id="receipt_header"
              value={branding.receipt_header || ''}
              onChange={(e) => handleChange('receipt_header', e.target.value)}
              placeholder="Welcome to Grand Palace Hotel"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="receipt_footer">Receipt Footer</Label>
            <Textarea
              id="receipt_footer"
              value={branding.receipt_footer || ''}
              onChange={(e) => handleChange('receipt_footer', e.target.value)}
              placeholder="Thank you for your patronage"
              rows={2}
            />
          </div>
        </div>
      </ConfigCard>
    </div>
  );
}
