import { Calendar, Clock, Users, Utensils, MapPin } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface DiningReservationDetailsProps {
  metadata: Record<string, any>;
}

export function DiningReservationDetails({ metadata }: DiningReservationDetailsProps) {
  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-2 border-primary/20">
        <div className="bg-gradient-to-br from-orange-500/10 via-red-500/10 to-primary/10 p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Utensils className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-display font-bold text-foreground">
                Table Reservation
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Fine dining experience awaits
              </p>
            </div>
          </div>

          <Separator className="bg-primary/20" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 bg-background/50 backdrop-blur-sm p-4 rounded-lg">
              <Calendar className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground mb-1">Reservation Date</p>
                <p className="font-semibold text-foreground">{metadata.reservation_date || 'Not specified'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-background/50 backdrop-blur-sm p-4 rounded-lg">
              <Clock className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground mb-1">Reservation Time</p>
                <p className="font-semibold text-foreground">{metadata.reservation_time || 'Not specified'}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-background/50 backdrop-blur-sm p-4 rounded-lg">
            <Users className="h-6 w-6 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground mb-1">Number of Guests</p>
              <p className="font-semibold text-lg text-foreground">
                {metadata.number_of_guests || 0} {metadata.number_of_guests === 1 ? 'guest' : 'guests'}
              </p>
            </div>
          </div>

          {metadata.guest_name && (
            <div className="flex items-center gap-3 bg-background/50 backdrop-blur-sm p-4 rounded-lg">
              <svg className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Reserved Under</p>
                <p className="font-semibold text-foreground">{metadata.guest_name}</p>
              </div>
            </div>
          )}

          {metadata.guest_contact && (
            <div className="flex items-center gap-3 bg-background/50 backdrop-blur-sm p-4 rounded-lg">
              <svg className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Contact Number</p>
                <p className="font-semibold text-foreground">{metadata.guest_contact}</p>
              </div>
            </div>
          )}

          {metadata.table_preference && (
            <div className="flex items-center gap-3 bg-background/50 backdrop-blur-sm p-4 rounded-lg">
              <MapPin className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground mb-1">Table Preference</p>
                <p className="font-semibold text-foreground capitalize">{metadata.table_preference}</p>
              </div>
            </div>
          )}

          {metadata.special_requests && (
            <>
              <Separator className="bg-primary/20" />
              <div className="bg-background/50 backdrop-blur-sm p-4 rounded-lg">
                <p className="text-xs font-medium text-muted-foreground mb-2">Special Requests</p>
                <p className="text-sm text-foreground">{metadata.special_requests}</p>
              </div>
            </>
          )}

          {metadata.occasion && (
            <div className="bg-gradient-to-r from-primary/20 to-accent/20 p-4 rounded-lg border border-primary/30">
              <p className="text-xs font-medium text-muted-foreground mb-1">Special Occasion</p>
              <p className="font-semibold text-foreground capitalize">🎉 {metadata.occasion}</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
