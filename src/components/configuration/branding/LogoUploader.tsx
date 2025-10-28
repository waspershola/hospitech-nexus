import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface LogoUploaderProps {
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  description?: string;
}

export function LogoUploader({ value, onChange, label = 'Hotel Logo', description }: LogoUploaderProps) {
  const { tenantId } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const { upload, remove, uploading } = useFileUpload({
    bucket: 'branding-assets',
    folder: `${tenantId}/logos`,
    maxSizeMB: 2,
    allowedTypes: ['image/png', 'image/svg+xml', 'image/jpeg', 'image/webp']
  });

  const handleFileSelect = async (file: File) => {
    const url = await upload(file);
    if (url) {
      onChange(url);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleRemove = async () => {
    if (value) {
      await remove(value);
      onChange(null);
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      
      <div
        className={cn(
          "relative border-2 border-dashed rounded-xl transition-all",
          isDragging ? "border-primary bg-primary/5" : "border-border",
          "hover:border-primary/50 hover:bg-accent/50"
        )}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {value ? (
          <div className="relative p-4">
            <img 
              src={value} 
              alt="Logo preview" 
              className="max-h-32 mx-auto object-contain"
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
          </div>
        ) : (
          <div 
            className="p-8 text-center cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <div className="animate-spin">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">Uploading...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">Drop logo here or click to upload</p>
                <p className="text-xs text-muted-foreground">PNG, SVG, JPG up to 2MB</p>
              </div>
            )}
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/svg+xml,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
        }}
      />
    </div>
  );
}
