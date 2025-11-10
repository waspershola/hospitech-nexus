import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

interface BulkQRDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (data: BulkGenerateData) => Promise<void>;
}

export interface BulkGenerateData {
  scope: 'room' | 'common_area' | 'facility';
  quantity: number;
  prefix: string;
  services: string[];
  welcome_message: string;
}

const AVAILABLE_SERVICES = [
  { value: 'digital_menu', label: 'Digital Menu' },
  { value: 'wifi', label: 'WiFi Access' },
  { value: 'room_service', label: 'Room Service' },
  { value: 'housekeeping', label: 'Housekeeping' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'concierge', label: 'Concierge' },
  { value: 'front_desk', label: 'Front Desk' },
  { value: 'feedback', label: 'Share Feedback' },
  { value: 'spa', label: 'Spa Services' },
  { value: 'laundry', label: 'Laundry' },
  { value: 'dining', label: 'Dining Reservations' },
];

export default function BulkQRDialog({ open, onOpenChange, onGenerate }: BulkQRDialogProps) {
  const [scope, setScope] = useState<'room' | 'common_area' | 'facility'>('room');
  const [quantity, setQuantity] = useState('10');
  const [prefix, setPrefix] = useState('');
  const [services, setServices] = useState<string[]>(['digital_menu', 'wifi', 'housekeeping', 'room_service']);
  const [welcomeMessage, setWelcomeMessage] = useState('Welcome! Scan to request services.');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleServiceToggle = (service: string) => {
    setServices(prev =>
      prev.includes(service)
        ? prev.filter(s => s !== service)
        : [...prev, service]
    );
  };

  const handleGenerate = async () => {
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty < 1 || qty > 100) {
      toast.error('Please enter a valid quantity (1-100)');
      return;
    }

    if (services.length === 0) {
      toast.error('Please select at least one service');
      return;
    }

    setIsGenerating(true);
    try {
      await onGenerate({
        scope,
        quantity: qty,
        prefix: prefix.trim(),
        services,
        welcome_message: welcomeMessage,
      });
      onOpenChange(false);
      // Reset form
      setQuantity('10');
      setPrefix('');
      setServices(['digital_menu', 'wifi', 'housekeeping', 'room_service']);
      setWelcomeMessage('Welcome! Scan to request services.');
    } catch (error) {
      console.error('Bulk generation error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Generate QR Codes</DialogTitle>
          <DialogDescription>
            Generate multiple QR codes at once for rooms or locations
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Scope</Label>
            <Select value={scope} onValueChange={(v: any) => setScope(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="room">Room</SelectItem>
                <SelectItem value="common_area">Common Area</SelectItem>
                <SelectItem value="facility">Facility</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quantity (1-100)</Label>
              <Input
                type="number"
                min="1"
                max="100"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="10"
              />
            </div>

            <div className="space-y-2">
              <Label>Name Prefix (Optional)</Label>
              <Input
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                placeholder="e.g., 'Room-' or 'Lobby-'"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Welcome Message</Label>
            <Input
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              placeholder="Welcome! Scan to request services."
            />
          </div>

          <div className="space-y-2">
            <Label>Available Services</Label>
            <div className="grid grid-cols-2 gap-3 p-4 border rounded-lg bg-muted/30">
              {AVAILABLE_SERVICES.map((service) => (
                <div key={service.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={service.value}
                    checked={services.includes(service.value)}
                    onCheckedChange={() => handleServiceToggle(service.value)}
                  />
                  <Label
                    htmlFor={service.value}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {service.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> QR codes will be automatically named as "{prefix || scope}-1", "{prefix || scope}-2", etc.
              You can edit individual codes after generation.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? 'Generating...' : `Generate ${quantity} QR Codes`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
