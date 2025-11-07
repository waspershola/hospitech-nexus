import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Mail, MessageSquare, Copy } from 'lucide-react';

interface PasswordDeliverySelectorProps {
  value: 'email' | 'sms' | 'manual';
  onChange: (value: 'email' | 'sms' | 'manual') => void;
  disabled?: boolean;
  userEmail?: string;
  userPhone?: string;
}

export function PasswordDeliverySelector({
  value,
  onChange,
  disabled,
  userEmail,
  userPhone,
}: PasswordDeliverySelectorProps) {
  return (
    <div className="space-y-3">
      <Label>Password Delivery Method</Label>
      <RadioGroup value={value} onValueChange={onChange} disabled={disabled}>
        <div className="flex items-start space-x-2 border rounded-lg p-3 hover:bg-accent/50 transition-colors">
          <RadioGroupItem value="email" id="delivery-email" className="mt-1" />
          <div className="flex-1">
            <Label htmlFor="delivery-email" className="flex items-center gap-2 cursor-pointer font-medium">
              <Mail className="h-4 w-4 text-primary" />
              Send via Email
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              {userEmail ? `Will send to: ${userEmail}` : 'Send reset link to user email (default)'}
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-2 border rounded-lg p-3 hover:bg-accent/50 transition-colors">
          <RadioGroupItem value="sms" id="delivery-sms" className="mt-1" />
          <div className="flex-1">
            <Label htmlFor="delivery-sms" className="flex items-center gap-2 cursor-pointer font-medium">
              <MessageSquare className="h-4 w-4 text-primary" />
              Send via SMS
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              {userPhone ? `Will send to: ${userPhone}` : 'Requires phone number'}
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-2 border rounded-lg p-3 hover:bg-accent/50 transition-colors">
          <RadioGroupItem value="manual" id="delivery-manual" className="mt-1" />
          <div className="flex-1">
            <Label htmlFor="delivery-manual" className="flex items-center gap-2 cursor-pointer font-medium">
              <Copy className="h-4 w-4 text-primary" />
              Copy Manually
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              Show password for manual delivery (one-time view)
            </p>
          </div>
        </div>
      </RadioGroup>
    </div>
  );
}
