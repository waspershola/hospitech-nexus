import { useConfigStore } from '@/stores/configStore';
import { ConfigCard } from '../shared/ConfigCard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Palette, Image as ImageIcon, Type, FileText } from 'lucide-react';
import { LogoUploader } from '../branding/LogoUploader';
import { FaviconUploader } from '../branding/FaviconUploader';
import { HeroImageUploader } from '../branding/HeroImageUploader';
import { FontSelector } from '../branding/FontSelector';
import { BrandingPreview } from '../branding/BrandingPreview';
import { PortalPreview } from '../shared/PortalPreview';

export function BrandingTab() {
  const { branding, updateBranding, saveBranding, unsavedChanges, version } = useConfigStore();

  const handleChange = (field: string, value: any) => {
    updateBranding({ [field]: value });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <PortalPreview />
        
        <ConfigCard
          title="Hotel Identity"
          description="Upload your hotel's visual brand assets"
          icon={ImageIcon}
          onSave={saveBranding}
          hasUnsavedChanges={unsavedChanges.has('branding')}
        >
          <div className="space-y-6">
            <LogoUploader
              value={branding.logo_url}
              onChange={(url) => handleChange('logo_url', url)}
              label="Main Logo"
              description="Primary logo for dashboard and guest portal"
            />
            
            <FaviconUploader
              value={branding.favicon_url}
              onChange={(url) => handleChange('favicon_url', url)}
            />
          </div>
        </ConfigCard>

        <ConfigCard
          title="Hero Banner"
          description="Large banner image for guest portal homepage"
          icon={ImageIcon}
          onSave={saveBranding}
          hasUnsavedChanges={unsavedChanges.has('branding')}
        >
          <HeroImageUploader
            imageUrl={branding.hero_image}
            headline={branding.headline}
            onImageChange={(url) => handleChange('hero_image', url)}
            onHeadlineChange={(headline) => handleChange('headline', headline)}
          />
        </ConfigCard>

        <ConfigCard
          title="Brand Colors"
          description="Define your hotel's color identity"
          icon={Palette}
          onSave={saveBranding}
          hasUnsavedChanges={unsavedChanges.has('branding')}
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
          icon={Type}
          onSave={saveBranding}
          hasUnsavedChanges={unsavedChanges.has('branding')}
        >
          <FontSelector
            headingFont={branding.font_heading || 'Playfair Display'}
            bodyFont={branding.font_body || 'Inter'}
            onHeadingChange={(font) => handleChange('font_heading', font)}
            onBodyChange={(font) => handleChange('font_body', font)}
          />
        </ConfigCard>

        <ConfigCard
          title="Receipt Customization"
          description="Header and footer text for printed documents"
          icon={FileText}
          onSave={saveBranding}
          hasUnsavedChanges={unsavedChanges.has('branding')}
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

      <div className="lg:col-span-1">
        <div className="sticky top-6">
          <BrandingPreview
            logoUrl={branding.logo_url}
            heroImage={branding.hero_image}
            headline={branding.headline}
            primaryColor={branding.primary_color || '#D32F2F'}
            secondaryColor={branding.secondary_color || '#FFD700'}
            accentColor={branding.accent_color || '#F4E5A1'}
            fontHeading={branding.font_heading || 'Playfair Display'}
            fontBody={branding.font_body || 'Inter'}
          />
        </div>
      </div>
    </div>
  );
}
