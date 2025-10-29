import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { GuestSelection } from './steps/GuestSelection';
import { RoomSelection } from './steps/RoomSelection';
import { BookingConfirmation } from './steps/BookingConfirmation';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface BookingFlowProps {
  open: boolean;
  onClose: () => void;
  preselectedRoomId?: string;
}

export type BookingData = {
  guestId?: string;
  roomId?: string;
  checkIn?: Date;
  checkOut?: Date;
  totalAmount?: number;
  organizationId?: string;
};

export function BookingFlow({ open, onClose, preselectedRoomId }: BookingFlowProps) {
  const [step, setStep] = useState(1);
  const [bookingData, setBookingData] = useState<BookingData>({
    roomId: preselectedRoomId,
  });

  const steps = [
    { number: 1, title: 'Select Guest', component: GuestSelection },
    { number: 2, title: 'Select Room & Dates', component: RoomSelection },
    { number: 3, title: 'Confirm Booking', component: BookingConfirmation },
  ];

  const currentStep = steps.find(s => s.number === step);
  const CurrentComponent = currentStep?.component;

  const handleNext = () => {
    if (step < steps.length) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleComplete = () => {
    setStep(1);
    setBookingData({ roomId: preselectedRoomId });
    onClose();
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return !!bookingData.guestId;
      case 2:
        return !!bookingData.roomId && !!bookingData.checkIn && !!bookingData.checkOut;
      case 3:
        return true;
      default:
        return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Create New Booking</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              {steps.map((s) => (
                <span
                  key={s.number}
                  className={s.number === step ? 'text-primary font-medium' : ''}
                >
                  {s.title}
                </span>
              ))}
            </div>
            <Progress value={(step / steps.length) * 100} />
          </div>

          {/* Step Content */}
          <div className="min-h-[300px]">
            {CurrentComponent && (
              <CurrentComponent
                bookingData={bookingData}
                onChange={setBookingData}
                onNext={handleNext}
                onComplete={handleComplete}
              />
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={step === 1}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            {step < steps.length ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
