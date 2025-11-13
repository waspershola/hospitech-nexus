import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useQRToken } from '@/hooks/useQRToken';
import { usePlatformFee } from '@/hooks/usePlatformFee';
import { calculateQRPlatformFee } from '@/lib/finance/platformFee';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Calendar, Clock, Users, Loader2, UtensilsCrossed } from 'lucide-react';
import { toast } from 'sonner';

export function QRDiningReservation() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { qrData } = useQRToken(token);
  const { data: platformFeeConfig } = usePlatformFee(qrData?.tenant_id);
  const [guestName, setGuestName] = useState('');
  const [guestContact, setGuestContact] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [reservationDate, setReservationDate] = useState('');
  const [reservationTime, setReservationTime] = useState('');
  const [numberOfGuests, setNumberOfGuests] = useState('2');
  const [specialRequests, setSpecialRequests] = useState('');
  const [estimatedAmount, setEstimatedAmount] = useState<number | null>(null);

  const createReservation = useMutation({
    mutationFn: async () => {
      // Phase 3: Enhanced validation and logging
      if (!token || !qrData?.tenant_id) {
        console.error('[QRDiningReservation] Missing required data:', {
          has_token: !!token,
          has_tenant_id: !!qrData?.tenant_id,
        });
        toast.error('Session not ready. Please wait and try again.');
        return;
      }
      if (!token || !guestName || !reservationDate || !reservationTime || !numberOfGuests) {
        throw new Error('Please fill in all required fields');
      }

      console.log('[QRDiningReservation] Creating reservation:', {
        guest_name: guestName,
        date: reservationDate,
        time: reservationTime,
        guests: numberOfGuests,
        tenant_id: qrData?.tenant_id,
      });

      const { data: reservation, error: reservationError } = await supabase
        .from('restaurant_reservations')
        .insert({
          tenant_id: qrData?.tenant_id,
          qr_token: token,
          guest_name: guestName,
          guest_contact: guestContact || null,
          guest_email: guestEmail || null,
          reservation_date: reservationDate,
          reservation_time: reservationTime,
          number_of_guests: parseInt(numberOfGuests),
          special_requests: specialRequests || null,
          status: 'pending',
        })
        .select()
        .single();

      if (reservationError) {
        console.error('[QRDiningReservation] Reservation insert error:', {
          message: reservationError.message,
          code: reservationError.code,
          details: reservationError.details,
          hint: reservationError.hint,
        });
        throw reservationError;
      }

      console.log('[QRDiningReservation] Reservation created:', reservation.id);

      // Calculate final amount with platform fee if estimated amount provided
      let finalAmount = estimatedAmount;
      if (estimatedAmount && estimatedAmount > 0) {
        const platformFeeBreakdown = calculateQRPlatformFee(estimatedAmount, platformFeeConfig || null);
        finalAmount = platformFeeBreakdown.totalAmount;
      }

      // Create a request entry for tracking and notifications
      const { data: request, error: requestError } = await supabase
        .from('requests')
        .insert({
          tenant_id: qrData?.tenant_id,
          qr_token: token,
          type: 'dining',
          service_category: 'dining_reservation',
          assigned_department: 'restaurant',
          note: `Dining Reservation: ${guestName} - ${numberOfGuests} guests on ${reservationDate} at ${reservationTime}${specialRequests ? ` | Requests: ${specialRequests}` : ''}`,
          priority: 'normal',
          status: 'pending',
          metadata: {
            reservation_id: reservation.id,
            guest_contact: guestContact,
            guest_email: guestEmail,
            reservation_date: reservationDate,
            reservation_time: reservationTime,
            number_of_guests: parseInt(numberOfGuests),
            payment_info: {
              billable: true,
              amount: finalAmount, // Staff will adjust after service if not provided
              currency: 'NGN',
              status: 'pending',
              location: 'Restaurant',
            },
          },
        })
        .select()
        .single();

      if (requestError) {
        console.error('[QRDiningReservation] Request insert error:', {
          message: requestError.message,
          code: requestError.code,
          details: requestError.details,
        });
        throw requestError;
      }

      console.log('[QRDiningReservation] Request created:', request.id);
      return { reservation, request };
    },
    onSuccess: (data) => {
      toast.success('Reservation request submitted successfully!');
      // Reset form
      setGuestName('');
      setGuestContact('');
      setGuestEmail('');
      setReservationDate('');
      setReservationTime('');
      setNumberOfGuests('2');
      setSpecialRequests('');
      
      if (data?.request) {
        console.log('[QRDiningReservation] Navigating to request status:', data.request.id);
        navigate(`/qr/${token}/request/${data.request.id}`);
      }
    },
    onError: (error: any) => {
      console.error('[QRDiningReservation] Mutation error:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        error,
      });
      toast.error(`Error: ${error.message || 'Failed to submit reservation'}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrData?.tenant_id) {
      toast.error('Session not ready. Please wait and try again.');
      return;
    }
    createReservation.mutate();
  };

  if (!qrData || !qrData.tenant_id) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading your session...</p>
      </div>
    );
  }

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];
  
  // Get maximum date (3 months from now)
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 3);
  const maxDateStr = maxDate.toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
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
              <UtensilsCrossed className="h-5 w-5 text-primary" />
              Dining Reservation
            </h1>
            <p className="text-sm text-muted-foreground">{qrData?.tenant?.hotel_name}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card className="shadow-xl border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="font-display text-2xl">Reserve Your Table</CardTitle>
            <CardDescription>
              Please provide your details and preferred date/time. We'll confirm your reservation shortly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Guest Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Guest Information</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your full name"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contact">Phone Number</Label>
                    <Input
                      id="contact"
                      type="tel"
                      placeholder="e.g., +234 123 456 7890"
                      value={guestContact}
                      onChange={(e) => setGuestContact(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Reservation Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Reservation Details</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Date *
                    </Label>
                    <Input
                      id="date"
                      type="date"
                      value={reservationDate}
                      onChange={(e) => setReservationDate(e.target.value)}
                      min={today}
                      max={maxDateStr}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="time" className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Time *
                    </Label>
                    <Input
                      id="time"
                      type="time"
                      value={reservationTime}
                      onChange={(e) => setReservationTime(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="guests" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Number of Guests *
                  </Label>
                  <Input
                    id="guests"
                    type="number"
                    min="1"
                    max="20"
                    value={numberOfGuests}
                    onChange={(e) => setNumberOfGuests(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Special Requests */}
              <div className="space-y-2">
                <Label htmlFor="requests">Special Requests (optional)</Label>
                <Textarea
                  id="requests"
                  placeholder="Dietary restrictions, seating preferences, special occasions..."
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  rows={4}
                />
              </div>

              {/* Optional Estimated Amount */}
              <div className="space-y-3">
                <Label htmlFor="estimated-amount">Estimated Bill Amount (optional)</Label>
                <div className="flex gap-2">
                  <span className="flex items-center px-3 py-2 bg-muted rounded-md">₦</span>
                  <Input
                    id="estimated-amount"
                    type="number"
                    min="0"
                    step="100"
                    placeholder="e.g., 50000"
                    value={estimatedAmount || ''}
                    onChange={(e) => setEstimatedAmount(e.target.value ? parseFloat(e.target.value) : null)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  If you have an estimated bill amount, enter it here. Otherwise, staff will set the amount after your meal.
                </p>

                {/* Platform Fee Display */}
                {estimatedAmount && estimatedAmount > 0 && (() => {
                  const platformFeeBreakdown = calculateQRPlatformFee(estimatedAmount, platformFeeConfig || null);
                  
                  return (
                    <div className="p-3 bg-muted/50 rounded-lg space-y-2 mt-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Base Amount:</span>
                        <span>₦{estimatedAmount.toLocaleString()}</span>
                      </div>
                      
                      {platformFeeBreakdown.platformFee > 0 && platformFeeConfig?.payer === 'guest' && (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              Platform Fee {platformFeeConfig.fee_type === 'flat' ? '(Flat)' : `(${platformFeeConfig.qr_fee}%)`}
                              {' (charged to guest)'}
                            </span>
                            <span className="text-muted-foreground">
                              +₦{platformFeeBreakdown.platformFee.toFixed(2)}
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center pt-2 border-t font-semibold">
                            <span>Estimated Total:</span>
                            <span className="text-lg text-primary">
                              ₦{platformFeeBreakdown.totalAmount.toLocaleString()}
                            </span>
                          </div>
                        </>
                      )}
                      
                      {(!platformFeeBreakdown.platformFee || platformFeeConfig?.payer !== 'guest') && (
                        <div className="flex justify-between items-center pt-2 border-t font-semibold">
                          <span>Estimated Total:</span>
                          <span className="text-lg text-primary">
                            ₦{estimatedAmount.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Important Note */}
              <div className="p-4 bg-muted/50 rounded-lg border border-border">
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> This is a reservation request. Our restaurant team will review your request and confirm availability within 1 hour. You'll receive updates via the chat interface.
                </p>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={createReservation.isPending}
              >
                {createReservation.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Reservation Request'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
