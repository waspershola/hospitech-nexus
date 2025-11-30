import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { FileText, Download, Mail, Loader2, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';

interface BookingConfirmationDocumentProps {
  bookingId: string;
}

export function BookingConfirmationDocument({ bookingId }: BookingConfirmationDocumentProps) {
  // Fetch booking details
  const { data: booking, isLoading: bookingLoading, error: bookingError } = useQuery({
    queryKey: ['booking-document', bookingId],
    queryFn: async () => {
      console.log('BookingConfirmationDocument - Fetching booking:', bookingId);
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          guest:guests(*),
          room:rooms!bookings_room_id_fkey(*, category:room_categories(*)),
          organization:organizations(*)
        `)
        .eq('id', bookingId)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Booking not found');
      return data;
    },
  });

  // Fetch branding
  const { data: branding } = useQuery({
    queryKey: ['branding', booking?.tenant_id],
    queryFn: async () => {
      if (!booking?.tenant_id) return null;
      
      const { data, error } = await supabase
        .from('hotel_branding')
        .select('*')
        .eq('tenant_id', booking.tenant_id)
        .single();

      if (error) return null;
      return data;
    },
    enabled: !!booking?.tenant_id,
  });

  // Fetch hotel meta
  const { data: hotelMeta } = useQuery({
    queryKey: ['hotel-meta', booking?.tenant_id],
    queryFn: async () => {
      if (!booking?.tenant_id) return null;
      
      const { data, error } = await supabase
        .from('hotel_meta')
        .select('*')
        .eq('tenant_id', booking.tenant_id)
        .single();

      if (error) return null;
      return data;
    },
    enabled: !!booking?.tenant_id,
  });

  // Fetch payments
  const { data: payments } = useQuery({
    queryKey: ['booking-payments-doc', bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('booking_id', bookingId)
        .eq('status', 'completed');

      if (error) throw error;
      return data || [];
    },
  });

  const handleDownloadPDF = async () => {
    const printContent = document.getElementById('booking-confirmation-content');
    if (!printContent) {
      toast.error('Unable to generate PDF');
      return;
    }

    try {
      toast.loading('Generating PDF...');
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).jsPDF;

      const canvas = await html2canvas(printContent, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Booking_Confirmation_${booking.id.slice(0, 8)}.pdf`);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const handleEmailConfirmation = async () => {
    if (!booking.guest?.email) {
      toast.error('Guest has no email address');
      return;
    }

    try {
      toast.loading('Sending email...');
      
      const { error } = await supabase.functions.invoke('send-email-notification', {
        body: {
          tenant_id: booking.tenant_id,
          to: booking.guest.email,
          event_key: 'booking_confirmed',
          variables: {
            guest_name: booking.guest.name,
            room_type: booking.room?.category?.name || 'Room',
            booking_reference: booking.id.slice(0, 8).toUpperCase(),
            check_in_date: format(new Date(booking.check_in), 'PPP'),
            check_out_date: format(new Date(booking.check_out), 'PPP'),
            nights: nights.toString(),
            rate_per_night: Number(booking.total_amount / nights).toLocaleString(),
            total_amount: Number(booking.total_amount).toLocaleString(),
            hotel_name: hotelMeta?.hotel_name || 'Hotel',
            frontdesk_phone: hotelMeta?.contact_phone || '',
            contact_email: hotelMeta?.contact_email || ''
          },
          booking_id: booking.id,
          guest_id: booking.guest?.id
        }
      });

      if (error) throw error;
      toast.success('Confirmation email sent to guest');
    } catch (error) {
      console.error('Email sending error:', error);
      toast.error('Failed to send email');
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById('booking-confirmation-content');
    if (!printContent) {
      toast.error('Unable to print');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print');
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Booking Confirmation - ${booking.id.slice(0, 8)}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            @media print { 
              @page { margin: 10mm; } 
              body { margin: 0; }
            }
          </style>
        </head>
        <body>${printContent.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  if (bookingLoading) {
    return (
      <Card className="p-6">
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading booking confirmation...</p>
        </div>
      </Card>
    );
  }

  if (bookingError) {
    console.error('BookingConfirmationDocument - Error:', bookingError);
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50 text-destructive" />
          <p className="text-lg font-semibold mb-2">Error Loading Booking</p>
          <p className="text-sm text-muted-foreground mb-4">
            {bookingError.message || 'Unable to load booking confirmation'}
          </p>
          <p className="text-xs text-muted-foreground">
            Booking ID: {bookingId}
          </p>
        </div>
      </Card>
    );
  }

  if (!booking) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-semibold mb-2">Booking Not Found</p>
          <p className="text-sm text-muted-foreground">
            No booking exists with ID: {bookingId}
          </p>
        </div>
      </Card>
    );
  }

  const metadata = booking.metadata as any;
  const totalPaid = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  const balance = Number(booking.total_amount) - totalPaid;
  const nights = Math.ceil(
    (new Date(booking.check_out).getTime() - new Date(booking.check_in).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      <div className="flex gap-2 print:hidden">
        <Button variant="outline" onClick={handlePrint}>
          <FileText className="mr-2 h-4 w-4" />
          Print
        </Button>
        <Button variant="outline" onClick={handleDownloadPDF}>
          <Download className="mr-2 h-4 w-4" />
          Download PDF
        </Button>
        <Button variant="outline" onClick={handleEmailConfirmation}>
          <Mail className="mr-2 h-4 w-4" />
          Email to Guest
        </Button>
      </div>

      {/* Document */}
      <Card id="booking-confirmation-content" className="p-8 print:shadow-none">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            {branding?.logo_url && (
              <img src={branding.logo_url} alt="Logo" className="h-16 mb-4" />
            )}
            <h1 className="text-2xl font-bold">{hotelMeta?.hotel_name || 'Hotel'}</h1>
            {hotelMeta?.tagline && (
              <p className="text-muted-foreground">{hotelMeta.tagline}</p>
            )}
            {hotelMeta?.contact_email && (
              <p className="text-sm text-muted-foreground">{hotelMeta.contact_email}</p>
            )}
            {hotelMeta?.contact_phone && (
              <p className="text-sm text-muted-foreground">{hotelMeta.contact_phone}</p>
            )}
          </div>
          
          <div className="text-right">
            <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-lg mb-4">
              <CheckCircle className="h-5 w-5 text-primary" />
              <span className="font-semibold text-primary">CONFIRMED</span>
            </div>
            <p className="text-sm text-muted-foreground">Booking Reference</p>
            <p className="text-xl font-mono font-bold">{booking.id.slice(0, 8).toUpperCase()}</p>
            <div className="mt-4">
              <QRCodeSVG value={booking.id} size={80} />
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        {/* Guest Information */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Guest Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Guest Name</p>
              <p className="font-medium">{booking.guest?.name}</p>
            </div>
            {booking.guest?.email && (
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{booking.guest.email}</p>
              </div>
            )}
            {booking.guest?.phone && (
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{booking.guest.phone}</p>
              </div>
            )}
            {booking.organization && (
              <div>
                <p className="text-sm text-muted-foreground">Organization</p>
                <p className="font-medium">{booking.organization.name}</p>
              </div>
            )}
          </div>
        </div>

        <Separator className="my-6" />

        {/* Booking Details */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Booking Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Check-in Date</p>
              <p className="font-medium">{format(new Date(booking.check_in), 'PPP')}</p>
              <p className="text-xs text-muted-foreground">From 2:00 PM</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Check-out Date</p>
              <p className="font-medium">{format(new Date(booking.check_out), 'PPP')}</p>
              <p className="text-xs text-muted-foreground">Until 12:00 PM</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Room Type</p>
              <p className="font-medium">{booking.room?.category?.name || booking.room?.type}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Number of Nights</p>
              <p className="font-medium">{nights} {nights === 1 ? 'night' : 'nights'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Booking Date</p>
              <p className="font-medium">{format(new Date(booking.created_at), 'PPP')}</p>
            </div>
          </div>
        </div>

        {/* Special Requests */}
        {metadata?.special_requests && (
          <>
            <Separator className="my-6" />
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-3">Special Requests</h2>
              <p className="text-sm">{metadata.special_requests}</p>
            </div>
          </>
        )}

        <Separator className="my-6" />

        {/* Pricing Breakdown */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Pricing Summary</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Room Rate ({nights} {nights === 1 ? 'night' : 'nights'} × ₦{Number(metadata?.rate_override || booking.room?.rate || 0).toLocaleString()})</span>
              <span>₦{(nights * Number(metadata?.rate_override || booking.room?.rate || 0)).toLocaleString()}</span>
            </div>
            
            {metadata?.addons && Array.isArray(metadata.addons) && metadata.addons.length > 0 && (
              <>
                {metadata.addons.map((addon: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span>{addon.name}</span>
                    <span>₦{Number(addon.price).toLocaleString()}</span>
                  </div>
                ))}
              </>
            )}
            
            <Separator className="my-2" />
            
            <div className="flex justify-between font-semibold text-lg">
              <span>Total Amount</span>
              <span>₦{Number(booking.total_amount).toLocaleString()}</span>
            </div>
            
            {totalPaid > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Amount Paid</span>
                <span>₦{totalPaid.toLocaleString()}</span>
              </div>
            )}
            
            {balance > 0 && (
              <div className="flex justify-between text-destructive font-semibold">
                <span>Balance Due</span>
                <span>₦{balance.toLocaleString()}</span>
              </div>
            )}
            
            {metadata?.deposit_amount > 0 && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Deposit Required</span>
                <span>₦{Number(metadata.deposit_amount).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        <Separator className="my-6" />

        {/* Policies */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Hotel Policies</h2>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• Check-in time: 2:00 PM | Check-out time: 12:00 PM</p>
            <p>• Valid government-issued ID required at check-in</p>
            <p>• Cancellation policy: Contact hotel for details</p>
            <p>• Smoking is prohibited in all rooms</p>
            <p>• Pets are not allowed unless specified</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t text-center text-sm text-muted-foreground">
          <p>Thank you for choosing {hotelMeta?.hotel_name || 'our hotel'}!</p>
          <p className="mt-2">
            If you have any questions, please contact us at {hotelMeta?.contact_email || 'info@hotel.com'}
          </p>
          <p className="mt-4 text-xs">
            This is a computer-generated document and does not require a signature.
          </p>
        </div>
      </Card>
    </div>
  );
}
