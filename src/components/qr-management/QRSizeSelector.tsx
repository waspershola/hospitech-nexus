import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Ruler } from 'lucide-react';

export type QRSize = 'small' | 'medium' | 'large' | 'poster';

interface QRSizeSelectorProps {
  value: QRSize;
  onChange: (size: QRSize) => void;
  disabled?: boolean;
}

const SIZE_OPTIONS = [
  {
    value: 'small' as QRSize,
    label: 'Small',
    dimensions: '4" × 4"',
    description: 'Perfect for door hangers and small displays',
  },
  {
    value: 'medium' as QRSize,
    label: 'Medium',
    dimensions: '6" × 6"',
    description: 'Ideal for table cards and room placement',
  },
  {
    value: 'large' as QRSize,
    label: 'Large',
    dimensions: '8" × 8"',
    description: 'Great for counters and reception areas',
  },
  {
    value: 'poster' as QRSize,
    label: 'Poster',
    dimensions: '12" × 12"',
    description: 'Perfect for lobbies and public spaces',
  },
];

export function QRSizeSelector({ value, onChange, disabled }: QRSizeSelectorProps) {
  const selectedOption = SIZE_OPTIONS.find(opt => opt.value === value);

  return (
    <div className="space-y-2">
      <Label htmlFor="qr-size" className="flex items-center gap-2">
        <Ruler className="h-4 w-4" />
        Print Size
      </Label>
      <Select value={value} onValueChange={(val) => onChange(val as QRSize)} disabled={disabled}>
        <SelectTrigger id="qr-size">
          <SelectValue>
            {selectedOption && (
              <span>
                {selectedOption.label} <span className="text-muted-foreground">({selectedOption.dimensions})</span>
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {SIZE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{option.label}</span>
                  <span className="text-xs text-muted-foreground">{option.dimensions}</span>
                </div>
                <span className="text-xs text-muted-foreground">{option.description}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
