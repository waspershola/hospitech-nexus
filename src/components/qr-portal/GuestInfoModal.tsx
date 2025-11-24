import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Phone, Sparkles } from 'lucide-react';

interface GuestInfoModalProps {
  open: boolean;
  onSubmit: (name: string, phone: string) => void;
  onSkip: () => void;
}

/**
 * PHASE-1C: Guest Info Collection Modal
 * One-time collection of guest name and phone number
 * Optional fields - guest can skip
 */
export function GuestInfoModal({ open, onSubmit, onSkip }: GuestInfoModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = () => {
    if (name.trim()) {
      onSubmit(name.trim(), phone.trim());
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-2xl font-display text-center">Welcome!</DialogTitle>
          <DialogDescription className="text-center text-base pt-2">
            Help us serve you better by sharing your name. Phone number is optional. This information will be saved for your convenience across all services during your stay.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="guest-name" className="text-sm font-medium">
              Your Name *
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="guest-name"
                type="text"
                placeholder="e.g., John Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-10"
                maxLength={100}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="guest-phone" className="text-sm font-medium">
              Phone Number (Optional)
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="guest-phone"
                type="tel"
                placeholder="e.g., +234 800 123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="pl-10"
                maxLength={20}
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center pt-2">
            ✨ Your information is saved locally for 7 days and helps our staff identify your requests faster.
          </p>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Button
            onClick={handleSubmit}
            size="lg"
            className="w-full"
            disabled={!name.trim()}
          >
            Continue
          </Button>
          {!name.trim() && (
            <p className="text-xs text-muted-foreground text-center">
              Please provide your name to continue
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
