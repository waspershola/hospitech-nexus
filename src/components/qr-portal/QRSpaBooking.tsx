import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useQRToken } from '@/hooks/useQRToken';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Loader2, Clock, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface SpaService {
  id: string;
  service_name: string;
  category: string;
  description: string;
  duration: string;
  price: number;
  currency: string;
  image_url?: string;
}

export function QRSpaBooking() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { qrData } = useQRToken(token);
  const [selectedService, setSelectedService] = useState<SpaService | null>(null);
  const [preferredDateTime, setPreferredDateTime] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const { data: spaServices = [], isLoading } = useQuery({
    queryKey: ['spa-services', qrData?.tenant_id],
    queryFn: async () => {
      if (!qrData?.tenant_id) return [];
      const { data, error } = await supabase
        .from('spa_services')
        .select('*')
        .eq('tenant_id', qrData.tenant_id)
        .eq('is_available', true)
        .eq('status', 'approved')
        .order('category', { ascending: true })
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as SpaService[];
    },
    enabled: !!qrData?.tenant_id,
  });

  const createSpaBooking = useMutation({
    mutationFn: async () => {
      if (!token || !selectedService || !qrData?.tenant_id) {
        toast.error('Session not ready. Please wait and try again.');
        return;
      }

      const { data: request, error } = await supabase
        .from('requests')
        .insert({
          tenant_id: qrData?.tenant_id,
          qr_token: token,
          type: 'spa',
          service_category: 'spa',
          assigned_department: 'spa',
          note: `Spa Booking: ${selectedService.service_name} (${selectedService.duration})${preferredDateTime ? ` | Preferred: ${preferredDateTime}` : ''}${specialRequests ? ` | Requests: ${specialRequests}` : ''}`,
          priority: 'normal',
          guest_name: 'Guest',
          status: 'pending',
          metadata: {
            service_id: selectedService.id,
            service_name: selectedService.service_name,
            duration: selectedService.duration,
            price: selectedService.price,
            currency: selectedService.currency,
            preferred_datetime: preferredDateTime,
          },
        })
        .select()
        .single();

      if (error) throw error;
      return request;
    },
    onSuccess: (data) => {
      toast.success('Spa booking request submitted!');
      setSelectedService(null);
      setPreferredDateTime('');
      setSpecialRequests('');
      if (data) {
        navigate(`/qr/${token}/chat/${data.id}`);
      }
    },
    onError: () => {
      toast.error('Failed to submit spa booking');
    },
  });

  const categories = ['all', ...new Set(spaServices.map(item => item.category))];
  const filteredServices = activeCategory === 'all' 
    ? spaServices 
    : spaServices.filter(item => item.category === activeCategory);

  if (isLoading || !qrData || !qrData.tenant_id) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading your session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/qr/${token}`)}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Spa Services
              </h1>
              <p className="text-sm text-muted-foreground">{qrData?.tenant?.hotel_name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="flex flex-wrap gap-2 bg-card p-2 rounded-xl shadow-md h-auto">
            {categories.map(category => (
              <TabsTrigger 
                key={category} 
                value={category}
                className="capitalize rounded-lg"
              >
                {category.replace('_', ' ')}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeCategory} className="mt-6">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredServices.map(service => (
                <SpaServiceCard
                  key={service.id}
                  service={service}
                  isSelected={selectedService?.id === service.id}
                  onSelect={setSelectedService}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {filteredServices.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No spa services available in this category</p>
          </div>
        )}

        {/* Booking Form */}
        {selectedService && (
          <Card className="shadow-xl border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="font-display text-2xl">Book Your Spa Experience</CardTitle>
              <CardDescription>Complete your booking for {selectedService.service_name}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <h4 className="font-semibold text-lg">{selectedService.service_name}</h4>
                <p className="text-sm text-muted-foreground">{selectedService.description}</p>
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {selectedService.duration}
                    </span>
                    <Badge className="capitalize">{selectedService.category}</Badge>
                  </div>
                  <span className="text-xl font-bold text-accent">
                    {selectedService.currency} {selectedService.price.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="datetime">Preferred Date & Time (optional)</Label>
                <input
                  id="datetime"
                  type="datetime-local"
                  value={preferredDateTime}
                  onChange={(e) => setPreferredDateTime(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background"
                  min={new Date().toISOString().slice(0, 16)}
                />
                <p className="text-xs text-muted-foreground">
                  Our spa team will confirm availability and contact you
                </p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="requests">Special Requests (optional)</Label>
                <Textarea
                  id="requests"
                  placeholder="Any specific preferences, allergies, or medical conditions we should know about..."
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setSelectedService(null)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => createSpaBooking.mutate()}
                  disabled={createSpaBooking.isPending || !qrData?.tenant_id}
                >
                  {createSpaBooking.isPending ? 'Submitting...' : 'Submit Booking'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function SpaServiceCard({ 
  service, 
  isSelected,
  onSelect 
}: { 
  service: SpaService;
  isSelected: boolean;
  onSelect: (service: SpaService) => void;
}) {
  return (
    <Card 
      className={`group overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer ${
        isSelected ? 'border-2 border-primary shadow-xl' : ''
      }`}
      onClick={() => onSelect(service)}
    >
      {service.image_url && (
        <div className="relative aspect-video overflow-hidden">
          <img
            src={service.image_url}
            alt={service.service_name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        </div>
      )}
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="font-display text-lg">
            {service.service_name}
          </CardTitle>
          <Badge variant="secondary" className="capitalize">
            {service.category}
          </Badge>
        </div>
        <CardDescription className="line-clamp-2">
          {service.description}
        </CardDescription>
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {service.duration}
          </span>
          <span className="text-xl font-bold text-accent">
            {service.currency} {service.price.toFixed(2)}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <Button
          className="w-full rounded-full"
          size="lg"
          variant={isSelected ? "default" : "outline"}
        >
          {isSelected ? 'Selected' : 'Select Service'}
        </Button>
      </CardContent>
    </Card>
  );
}
