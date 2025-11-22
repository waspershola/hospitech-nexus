import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RoomDropdown } from '@/components/shared/RoomDropdown';
import { useQRServicesCatalog } from '@/hooks/useQRServicesCatalog';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

const qrCodeSchema = z.object({
  display_name: z.string().min(1, 'Display name is required'),
  assigned_to: z.string().optional(),
  scope: z.enum(['room', 'common_area', 'facility', 'event']),
  services: z.array(z.string()).min(1, 'Select at least one service'),
  welcome_message: z.string().min(1, 'Welcome message is required'),
  room_id: z.string().optional(),
  expires_at: z.string().optional(),
  status: z.enum(['active', 'inactive', 'expired']).optional(),
}).refine((data) => {
  // Require assigned_to ONLY if scope is NOT 'room'
  if (data.scope !== 'room') {
    return !!data.assigned_to && data.assigned_to.length > 0;
  }
  return true;
}, {
  message: "Location name is required for non-room QR codes",
  path: ["assigned_to"],
});

type QRCodeFormData = z.infer<typeof qrCodeSchema>;

interface QRCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  qrCode?: any;
  onSave: (data: QRCodeFormData) => Promise<void>;
}

export default function QRCodeDialog({ open, onOpenChange, qrCode, onSave }: QRCodeDialogProps) {
  const { data: availableServices = [], isLoading: servicesLoading } = useQRServicesCatalog();
  const form = useForm<QRCodeFormData>({
    resolver: zodResolver(qrCodeSchema),
    defaultValues: {
      display_name: '',
      assigned_to: '',
      scope: 'room',
      services: [],
      welcome_message: '',
      room_id: '',
      expires_at: '',
      status: 'active',
    },
  });

  // Auto-populate assigned_to from room selection when scope='room'
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'room_id' && value.scope === 'room' && value.room_id) {
        // Fetch room details and auto-fill assigned_to
        supabase
          .from('rooms')
          .select('number')
          .eq('id', value.room_id)
          .single()
          .then(({ data }) => {
            if (data) {
              form.setValue('assigned_to', `Room ${data.number}`);
            }
          });
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  useEffect(() => {
    if (qrCode) {
      form.reset({
        display_name: qrCode.display_name,
        assigned_to: qrCode.assigned_to,
        scope: qrCode.scope,
        services: qrCode.services || [],
        welcome_message: qrCode.welcome_message,
        room_id: qrCode.room_id || '',
        expires_at: qrCode.expires_at ? new Date(qrCode.expires_at).toISOString().slice(0, 16) : '',
        status: qrCode.status,
      });
    } else {
      form.reset({
        display_name: '',
        assigned_to: '',
        scope: 'room',
        services: [],
        welcome_message: 'Welcome! How can we assist you today?',
        room_id: '',
        expires_at: '',
        status: 'active',
      });
    }
  }, [qrCode, form]);

  const handleSubmit = async (data: QRCodeFormData) => {
    await onSave(data);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{qrCode ? 'Edit QR Code' : 'Create QR Code'}</DialogTitle>
          <DialogDescription>
            {qrCode ? 'Update QR code details and settings' : 'Create a new QR code for guest services'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="display_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Room 101 Services" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch('scope') === 'room' && (
              <FormField
                control={form.control}
                name="room_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Room</FormLabel>
                    <FormControl>
                      <RoomDropdown
                        value={field.value}
                        onChange={field.onChange}
                        excludeOccupied={!qrCode} // Exclude occupied rooms for NEW QR codes only
                      />
                    </FormControl>
                    <FormDescription>The room this QR code is assigned to</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {form.watch('scope') !== 'room' && (
              <FormField
                control={form.control}
                name="assigned_to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Pool Area, Conference Hall A, Gym" {...field} />
                    </FormControl>
                    <FormDescription>The location this QR code is assigned to</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="scope"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scope</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select scope" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="room">Room</SelectItem>
                      <SelectItem value="common_area">Common Area</SelectItem>
                      <SelectItem value="facility">Facility</SelectItem>
                      <SelectItem value="event">Event</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="services"
              render={() => (
                <FormItem>
                  <FormLabel>Available Services</FormLabel>
                  {servicesLoading ? (
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      {[...Array(6)].map((_, i) => (
                        <Skeleton key={i} className="h-6 w-full" />
                      ))}
                    </div>
                  ) : availableServices.length === 0 ? (
                    <p className="text-sm text-muted-foreground mt-2">
                      No services configured. Contact your administrator to set up QR services.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      {availableServices.map((service) => (
                        <FormField
                          key={service.service_key}
                          control={form.control}
                          name="services"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(service.service_key)}
                                  onCheckedChange={(checked) => {
                                    const updatedServices = checked
                                      ? [...(field.value || []), service.service_key]
                                      : field.value?.filter((val) => val !== service.service_key);
                                    field.onChange(updatedServices);
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">
                                {service.service_label}
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="welcome_message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Welcome Message</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter a welcoming message for guests"
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expires_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expires At (Optional)</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormDescription>Leave empty for no expiration</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {qrCode && (
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {qrCode ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
