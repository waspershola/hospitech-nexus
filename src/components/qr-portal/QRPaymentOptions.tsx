import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { Smartphone, CreditCard, Building2 } from 'lucide-react';

interface QRPaymentOptionsProps {
  guestPhone: string;
  onPhoneChange: (phone: string) => void;
  paymentChoice: 'pay_now' | 'bill_to_room';
  onPaymentChoiceChange: (choice: 'pay_now' | 'bill_to_room') => void;
  showPhone?: boolean;
}

export function QRPaymentOptions({
  guestPhone,
  onPhoneChange,
  paymentChoice,
  onPaymentChoiceChange,
  showPhone = true,
}: QRPaymentOptionsProps) {
  return (
    <div className="space-y-4">
      {showPhone && (
        <div>
          <Label htmlFor="phone" className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            Phone Number (Optional)
          </Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+234..."
            value={guestPhone}
            onChange={(e) => onPhoneChange(e.target.value)}
            className="mt-2"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Helps us match your order to your room if you're checked in
          </p>
        </div>
      )}

      <div>
        <Label className="mb-3 block">Payment Method</Label>
        <RadioGroup value={paymentChoice} onValueChange={onPaymentChoiceChange as any}>
          <Card
            className={`cursor-pointer transition-all ${
              paymentChoice === 'bill_to_room'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
            onClick={() => onPaymentChoiceChange('bill_to_room')}
          >
            <CardContent className="flex items-start gap-3 p-4">
              <RadioGroupItem value="bill_to_room" id="bill" className="mt-1" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="h-4 w-4 text-primary" />
                  <Label htmlFor="bill" className="font-semibold cursor-pointer">
                    Bill to Room
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Charge will be added to your room folio. Pay at checkout.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all ${
              paymentChoice === 'pay_now'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
            onClick={() => onPaymentChoiceChange('pay_now')}
          >
            <CardContent className="flex items-start gap-3 p-4">
              <RadioGroupItem value="pay_now" id="pay" className="mt-1" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <Label htmlFor="pay" className="font-semibold cursor-pointer">
                    Pay Now
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Complete payment immediately via secure payment gateway.
                </p>
              </div>
            </CardContent>
          </Card>
        </RadioGroup>
      </div>
    </div>
  );
}
