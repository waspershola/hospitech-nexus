import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Building2, CreditCard, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface QRPaymentOptionsProps {
  guestPhone: string;
  onPhoneChange: (phone: string) => void;
  paymentChoice: 'pay_now' | 'bill_to_room';
  onPaymentChoiceChange: (choice: 'pay_now' | 'bill_to_room') => void;
  showPhone?: boolean;
  billToRoomDisabled?: boolean; // PHASE-2-SIMPLIFICATION
  sessionExpired?: boolean; // PHASE-2-SIMPLIFICATION
}

export function QRPaymentOptions({ 
  guestPhone, 
  onPhoneChange, 
  paymentChoice, 
  onPaymentChoiceChange, 
  showPhone = true,
  billToRoomDisabled = false, // PHASE-2-SIMPLIFICATION
  sessionExpired = false // PHASE-2-SIMPLIFICATION
}: QRPaymentOptionsProps) {
  
  // PHASE-2-SIMPLIFICATION: Auto-switch to pay_now if bill-to-room is disabled
  if (billToRoomDisabled && paymentChoice === 'bill_to_room') {
    onPaymentChoiceChange('pay_now');
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-semibold mb-3 block">Payment Method</Label>
        
        {/* Session Expired Warning */}
        {sessionExpired && (
          <Alert variant="destructive" className="mb-3">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Your stay has ended. Room billing is no longer available.
            </AlertDescription>
          </Alert>
        )}
        
        <RadioGroup value={paymentChoice} onValueChange={(value) => onPaymentChoiceChange(value as 'pay_now' | 'bill_to_room')}>
          
          {/* Bill to Room - Only show if not disabled */}
          {!billToRoomDisabled && !sessionExpired && (
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
          )}

          {/* Pay Now - Always available */}
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
                  Complete payment immediately via our payment providers.
                </p>
              </div>
            </CardContent>
          </Card>
        </RadioGroup>
      </div>
      
      {/* Phone Number (only when bill-to-room is shown and selected) */}
      {showPhone && paymentChoice === 'bill_to_room' && !billToRoomDisabled && !sessionExpired && (
        <div className="space-y-2">
          <Label htmlFor="guest-phone">
            Phone Number <span className="text-muted-foreground text-xs">(for order matching)</span>
          </Label>
          <Input
            id="guest-phone"
            type="tel"
            placeholder="+234 xxx xxx xxxx"
            value={guestPhone}
            onChange={(e) => onPhoneChange(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}
