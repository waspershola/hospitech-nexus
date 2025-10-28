import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface HeroImageUploaderProps {
  imageUrl: string | null;
  headline: string | null;
  onImageChange: (url: string | null) => void;
  onHeadlineChange: (headline: string) => void;
}

export function HeroImageUploader({ 
  imageUrl, 
  headline, 
  onImageChange, 
  onHeadlineChange 
}: HeroImageUploaderProps) {
  const { tenantId } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const { upload, remove, uploading } = useFileUpload({
    bucket: 'branding-assets',
    folder: `${tenantId}/hero`,
    maxSizeMB: 5,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
  });

  const handleFileSelect = async (file: File) => {
    const url = await upload(file);
    if (url) {
      onImageChange(url);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleRemove = async () => {
    if (imageUrl) {
      await remove(imageUrl);
      onImageChange(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Hero Banner Image</Label>
        <p className="text-sm text-muted-foreground">Large banner for guest portal homepage</p>
      </div>
      
      <div
        className={cn(
          "relative border-2 border-dashed rounded-xl transition-all overflow-hidden",
          isDragging ? "border-primary bg-primary/5" : "border-border",
          "hover:border-primary/50 hover:bg-accent/50"
        )}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {imageUrl ? (
          <div className="relative">
            <img 
              src={imageUrl} 
              alt="Hero banner preview" 
              className="w-full h-48 object-cover"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={handleRemove}
              disabled={uploading}
            >
              <X className="h-4 w-4" />
            </Button>
            {headline && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <h2 className="text-3xl font-display text-white font-bold">
                  {headline}
                </h2>
              </div>
            )}
          </div>
        ) : (
          <div 
            className="p-12 text-center cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <div className="animate-spin">
                  <Upload className="h-10 w-10 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">Uploading...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <ImageIcon className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm font-medium">Drop hero image here or click to upload</p>
                <p className="text-xs text-muted-foreground">JPG, PNG, WEBP up to 5MB (1920x1080 recommended)</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="hero-headline">Hero Headline</Label>
        <Input
          id="hero-headline"
          value={headline || ''}
          onChange={(e) => onHeadlineChange(e.target.value)}
          placeholder="Welcome to Your Luxury Experience"
          className="text-lg"
        />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
        }}
      />
    </div>
  );
}
