import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, ShieldCheck } from 'lucide-react';
import { useOrgServiceRules } from '@/hooks/useOrgServiceRules';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface OrgServiceRestrictionsDialogProps {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  organizationName: string;
}

const AVAILABLE_SERVICES = [
  { id: 'room', label: 'Room Booking', description: 'Allow room reservations and bookings' },
  { id: 'breakfast', label: 'Breakfast', description: 'Allow breakfast service charges' },
  { id: 'lunch', label: 'Lunch', description: 'Allow lunch service charges' },
  { id: 'dinner', label: 'Dinner', description: 'Allow dinner service charges' },
  { id: 'bar', label: 'Bar', description: 'Allow bar service charges' },
  { id: 'spa', label: 'Spa & Wellness', description: 'Allow spa and wellness services' },
  { id: 'laundry', label: 'Laundry', description: 'Allow laundry services' },
  { id: 'room_service', label: 'Room Service', description: 'Allow in-room dining and services' },
  { id: 'minibar', label: 'Minibar', description: 'Allow minibar charges' },
  { id: 'events', label: 'Events & Conferences', description: 'Allow event bookings and conference room charges' },
];

export function OrgServiceRestrictionsDialog({
  open,
  onClose,
  organizationId,
  organizationName,
}: OrgServiceRestrictionsDialogProps) {
  const { serviceRules, isLoading, upsertServiceRules, isPending } = useOrgServiceRules(organizationId);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  useEffect(() => {
    if (serviceRules?.allowed_services) {
      setSelectedServices(serviceRules.allowed_services);
    } else {
      // Default: all services allowed
      setSelectedServices(AVAILABLE_SERVICES.map(s => s.id));
    }
  }, [serviceRules]);

  const handleToggle = (serviceId: string) => {
    setSelectedServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleSave = () => {
    upsertServiceRules(selectedServices, {
      onSuccess: () => {
        onClose();
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Service Restrictions - {organizationName}
          </DialogTitle>
          <DialogDescription>
            Configure which services this organization can use. Unselected services will be blocked.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <Alert>
              <AlertDescription>
                By default, all services are allowed. Uncheck services to restrict access.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              {AVAILABLE_SERVICES.map((service) => (
                <div key={service.id} className="flex items-start space-x-3 p-3 rounded-lg border">
                  <Checkbox
                    id={service.id}
                    checked={selectedServices.includes(service.id)}
                    onCheckedChange={() => handleToggle(service.id)}
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor={service.id}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {service.label}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {service.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-sm text-muted-foreground">
              {selectedServices.length === AVAILABLE_SERVICES.length ? (
                <p>✅ All services allowed</p>
              ) : selectedServices.length === 0 ? (
                <p className="text-destructive">⚠️ No services allowed - organization cannot use any services</p>
              ) : (
                <p>{selectedServices.length} of {AVAILABLE_SERVICES.length} services allowed</p>
              )}
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Restrictions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
