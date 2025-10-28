import { useState, useRef } from 'react';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface FaviconUploaderProps {
  value: string | null;
  onChange: (url: string | null) => void;
}

export function FaviconUploader({ value, onChange }: FaviconUploaderProps) {
  const { tenantId } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const { upload, remove, uploading } = useFileUpload({
    bucket: 'branding-assets',
    folder: `${tenantId}/favicon`,
    maxSizeMB: 0.5,
    allowedTypes: ['image/png', 'image/x-icon', 'image/svg+xml']
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
      <Label>Favicon</Label>
      <p className="text-sm text-muted-foreground">Browser tab icon (16x16 or 32x32 recommended)</p>
      
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
          <div className="relative p-4 flex items-center justify-center">
            <img 
              src={value} 
              alt="Favicon preview" 
              className="w-16 h-16 object-contain"
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
            className="p-6 text-center cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <div className="animate-spin">
                  <Upload className="h-4 w-4 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground">Uploading...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-6 w-6 text-muted-foreground" />
                <p className="text-xs font-medium">Drop favicon here</p>
                <p className="text-xs text-muted-foreground">PNG, ICO up to 500KB</p>
              </div>
            )}
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/x-icon,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
        }}
      />
    </div>
  );
}
