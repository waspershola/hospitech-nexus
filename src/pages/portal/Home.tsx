import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Hotel, Phone, Wifi, Coffee, Car } from 'lucide-react';

export default function PortalHome() {
  const { user } = useAuth();

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-display text-charcoal mb-2">
          Welcome Back!
        </h1>
        <p className="text-muted-foreground">{user?.email}</p>
      </div>

      <Card className="p-6 bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-display text-charcoal mb-1">Your Stay</h2>
            <p className="text-sm text-muted-foreground">Room details and information</p>
          </div>
          <Hotel className="w-8 h-8 text-accent" />
        </div>
        <div className="space-y-2">
          <p className="text-sm">
            <span className="font-medium">Room:</span> Coming soon
          </p>
          <p className="text-sm">
            <span className="font-medium">Check-in:</span> Coming soon
          </p>
          <p className="text-sm">
            <span className="font-medium">Check-out:</span> Coming soon
          </p>
        </div>
      </Card>

      <div>
        <h3 className="text-lg font-display text-charcoal mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-4">
          <Button
            variant="outline"
            className="h-24 flex-col gap-2"
          >
            <Phone className="w-6 h-6" />
            <span className="text-sm">Contact Front Desk</span>
          </Button>
          <Button
            variant="outline"
            className="h-24 flex-col gap-2"
          >
            <Coffee className="w-6 h-6" />
            <span className="text-sm">Room Service</span>
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-display text-charcoal mb-4">Hotel Amenities</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Wifi className="w-5 h-5 text-accent" />
            <div>
              <p className="font-medium text-charcoal">Free Wi-Fi</p>
              <p className="text-sm text-muted-foreground">High-speed internet throughout</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Car className="w-5 h-5 text-accent" />
            <div>
              <p className="font-medium text-charcoal">Parking</p>
              <p className="text-sm text-muted-foreground">Complimentary valet service</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Coffee className="w-5 h-5 text-accent" />
            <div>
              <p className="font-medium text-charcoal">24/7 Room Service</p>
              <p className="text-sm text-muted-foreground">Available anytime</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}