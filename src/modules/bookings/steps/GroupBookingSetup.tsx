import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, User, AlertCircle } from 'lucide-react';
import type { BookingData } from '../BookingFlow';

interface GroupBookingSetupProps {
  bookingData: BookingData;
  onChange: (data: BookingData) => void;
  onNext: () => void;
}

export function GroupBookingSetup({ bookingData, onChange, onNext }: GroupBookingSetupProps) {
  const [groupName, setGroupName] = useState(bookingData.groupName || '');
  const [groupSize, setGroupSize] = useState(bookingData.groupSize || 1);
  const [groupLeaderName, setGroupLeaderName] = useState(bookingData.groupLeaderName || '');
  
  // Generate groupId once when component mounts if not already set
  useEffect(() => {
    if (!bookingData.groupId) {
      const groupId = crypto.randomUUID();
      onChange({
        ...bookingData,
        groupId,
      });
    }
  }, []);

  const handleContinue = () => {
    onChange({
      ...bookingData,
      isGroupBooking: true,
      groupName,
      groupSize,
      groupLeaderName,
    });
    onNext();
  };

  const canProceed = groupName.trim() !== '' && groupSize > 0 && groupLeaderName.trim() !== '';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-lg bg-primary/10">
          <Users className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Group Booking Details</h3>
          <p className="text-sm text-muted-foreground">
            Configure details for this group reservation
          </p>
        </div>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Group bookings allow you to reserve multiple rooms under one group name with shared check-in/check-out dates.
        </AlertDescription>
      </Alert>

      <Card className="p-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="groupName">Group Name *</Label>
          <Input
            id="groupName"
            placeholder="e.g., Smith Family Reunion, ABC Corp Team"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            A descriptive name to identify this group booking
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="groupLeader">Group Leader/Contact Person *</Label>
          <Input
            id="groupLeader"
            placeholder="e.g., John Smith"
            value={groupLeaderName}
            onChange={(e) => setGroupLeaderName(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Primary contact person for this group
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="groupSize">Expected Group Size *</Label>
          <Input
            id="groupSize"
            type="number"
            min="1"
            max="100"
            value={groupSize}
            onChange={(e) => setGroupSize(parseInt(e.target.value) || 1)}
          />
          <p className="text-xs text-muted-foreground">
            Total number of guests in this group
          </p>
        </div>

        <div className="pt-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Rooms to book:</span>
            <Badge variant="secondary" className="text-base">
              {bookingData.selectedRoomIds?.length || 0} room(s)
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            You'll select rooms in the next step
          </p>
        </div>
      </Card>

      <Button 
        onClick={handleContinue} 
        disabled={!canProceed}
        className="w-full"
      >
        Continue to Room Selection
      </Button>
    </div>
  );
}
