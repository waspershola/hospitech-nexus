import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { GuestSelection } from './steps/GuestSelection';
import { RoomSelection } from './steps/RoomSelection';
import { GroupBookingSetup } from './steps/GroupBookingSetup';
import { MultiRoomSelection } from './steps/MultiRoomSelection';
import { BookingOptions } from './steps/BookingOptions';
import { BookingConfirmation } from './steps/BookingConfirmation';
import { ChevronLeft, ChevronRight, Users } from 'lucide-react';

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
  isGroupBooking?: boolean;
  groupName?: string;
  groupSize?: number;
  groupLeaderName?: string;
  selectedRoomIds?: string[];
  rateOverride?: number;
  selectedAddons?: string[];
  specialRequests?: string;
  requiresApproval?: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
};

export function BookingFlow({ open, onClose, preselectedRoomId }: BookingFlowProps) {
  const [step, setStep] = useState(1);
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [bookingData, setBookingData] = useState<BookingData>({
    roomId: preselectedRoomId,
  });

  const singleSteps = [
    { number: 1, title: 'Select Guest', component: GuestSelection },
    { number: 2, title: 'Select Room & Dates', component: RoomSelection },
    { number: 3, title: 'Booking Options', component: BookingOptions },
    { number: 4, title: 'Confirm Booking', component: BookingConfirmation },
  ];

  const groupSteps = [
    { number: 1, title: 'Select Guest', component: GuestSelection },
    { number: 2, title: 'Group Details', component: GroupBookingSetup },
    { number: 3, title: 'Select Rooms', component: MultiRoomSelection },
    { number: 4, title: 'Booking Options', component: BookingOptions },
    { number: 5, title: 'Confirm Booking', component: BookingConfirmation },
  ];

  const steps = isGroupMode ? groupSteps : singleSteps;

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
    setIsGroupMode(false);
    setBookingData({ roomId: preselectedRoomId });
    onClose();
  };

  const canProceed = () => {
    // Validate check-in date is not in the past
    const validateDates = () => {
      if (!bookingData.checkIn) return true; // Let step validation handle this
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const checkInDate = new Date(bookingData.checkIn);
      checkInDate.setHours(0, 0, 0, 0);
      
      return checkInDate >= today;
    };

    if (isGroupMode) {
      switch (step) {
        case 1:
          return !!bookingData.guestId;
        case 2:
          return !!bookingData.groupName && !!bookingData.groupLeaderName && (bookingData.groupSize || 0) > 0;
        case 3:
          return (bookingData.selectedRoomIds?.length || 0) > 0 && 
                 !!bookingData.checkIn && 
                 !!bookingData.checkOut && 
                 validateDates();
        case 4:
          return true; // Options step is always optional
        case 5:
          return !!bookingData.checkIn && 
                 !!bookingData.checkOut && 
                 (bookingData.selectedRoomIds?.length || 0) > 0 &&
                 validateDates();
        default:
          return false;
      }
    } else {
      switch (step) {
        case 1:
          return !!bookingData.guestId;
        case 2:
          return !!bookingData.roomId && 
                 !!bookingData.checkIn && 
                 !!bookingData.checkOut &&
                 validateDates();
        case 3:
          return true; // Options step is always optional
        case 4:
          return !!bookingData.checkIn && 
                 !!bookingData.checkOut && 
                 !!bookingData.roomId &&
                 validateDates();
        default:
          return false;
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">Create New Booking</DialogTitle>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="group-mode" className="text-sm cursor-pointer">
                Group Booking
              </Label>
              <Switch
                id="group-mode"
                checked={isGroupMode}
                onCheckedChange={(checked) => {
                  setIsGroupMode(checked);
                  setStep(1);
                  setBookingData({ roomId: preselectedRoomId });
                }}
                disabled={step > 1}
              />
            </div>
          </div>
          {isGroupMode && (
            <Badge variant="secondary" className="w-fit">
              <Users className="h-3 w-3 mr-1" />
              Group Mode
            </Badge>
          )}
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
