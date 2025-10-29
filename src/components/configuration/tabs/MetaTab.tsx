import { useEffect } from 'react';
import { useConfigStore } from '@/stores/configStore';
import { ConfigCard } from '../shared/ConfigCard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Building2, Mail, Phone, Share2 } from 'lucide-react';

export function MetaTab() {
  const { hotelMeta, updateHotelMeta, saveHotelMeta, loadHotelMeta, unsavedChanges } = useConfigStore();

  useEffect(() => {
    loadHotelMeta();
  }, [loadHotelMeta]);

  const handleChange = (field: string, value: any) => {
    updateHotelMeta({ [field]: value });
  };

  const handleSocialChange = (platform: string, value: string) => {
    const socialLinks = hotelMeta.social_links || {};
    updateHotelMeta({ 
      social_links: { ...socialLinks, [platform]: value } 
    });
  };

  return (
    <div className="space-y-6">
      <ConfigCard
        title="Hotel Profile"
        description="Basic information about your hotel"
        icon={Building2}
        onSave={saveHotelMeta}
        hasUnsavedChanges={unsavedChanges.has('hotel_meta')}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hotel_name">Hotel Name</Label>
            <Input
              id="hotel_name"
              value={hotelMeta.hotel_name || ''}
              onChange={(e) => handleChange('hotel_name', e.target.value)}
              placeholder="Grand Palace Hotel"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tagline">Tagline</Label>
            <Input
              id="tagline"
              value={hotelMeta.tagline || ''}
              onChange={(e) => handleChange('tagline', e.target.value)}
              placeholder="Where Luxury Meets Comfort"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={hotelMeta.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="A brief description of your hotel for SEO and guest portal..."
              rows={4}
            />
          </div>
        </div>
      </ConfigCard>

      <ConfigCard
        title="Contact Information"
        description="How guests can reach you"
        icon={Mail}
        onSave={saveHotelMeta}
        hasUnsavedChanges={unsavedChanges.has('hotel_meta')}
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contact_email">
              <Mail className="inline h-4 w-4 mr-2" />
              Contact Email
            </Label>
            <Input
              id="contact_email"
              type="email"
              value={hotelMeta.contact_email || ''}
              onChange={(e) => handleChange('contact_email', e.target.value)}
              placeholder="info@hotel.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_phone">
              <Phone className="inline h-4 w-4 mr-2" />
              Contact Phone
            </Label>
            <Input
              id="contact_phone"
              type="tel"
              value={hotelMeta.contact_phone || ''}
              onChange={(e) => handleChange('contact_phone', e.target.value)}
              placeholder="+1 (555) 123-4567"
            />
          </div>
        </div>
      </ConfigCard>

      <ConfigCard
        title="Social Media"
        description="Connect your social media profiles"
        icon={Share2}
        onSave={saveHotelMeta}
        hasUnsavedChanges={unsavedChanges.has('hotel_meta')}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="facebook">Facebook</Label>
            <Input
              id="facebook"
              value={hotelMeta.social_links?.facebook || ''}
              onChange={(e) => handleSocialChange('facebook', e.target.value)}
              placeholder="https://facebook.com/yourhotel"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="instagram">Instagram</Label>
            <Input
              id="instagram"
              value={hotelMeta.social_links?.instagram || ''}
              onChange={(e) => handleSocialChange('instagram', e.target.value)}
              placeholder="https://instagram.com/yourhotel"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="twitter">Twitter / X</Label>
            <Input
              id="twitter"
              value={hotelMeta.social_links?.twitter || ''}
              onChange={(e) => handleSocialChange('twitter', e.target.value)}
              placeholder="https://twitter.com/yourhotel"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="linkedin">LinkedIn</Label>
            <Input
              id="linkedin"
              value={hotelMeta.social_links?.linkedin || ''}
              onChange={(e) => handleSocialChange('linkedin', e.target.value)}
              placeholder="https://linkedin.com/company/yourhotel"
            />
          </div>
        </div>
      </ConfigCard>
    </div>
  );
}
