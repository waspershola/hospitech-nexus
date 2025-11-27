import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQRRequest } from '@/hooks/useQRRequest';
import { useQRToken } from '@/hooks/useQRToken';
import { useGuestSessionContext } from '@/components/qr-portal/QRPortalWrapper'; // GUEST-SESSION-SECURITY
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';

export function QRServiceRequestForm() {
  const { token, service } = useParams<{ token: string; service: string }>();
  const navigate = useNavigate();
  const { qrData } = useQRToken(token);
  const { isCreating, createRequest } = useQRRequest();
  const { guestSessionToken } = useGuestSessionContext(); // GUEST-SESSION-SECURITY

  const [guestName, setGuestName] = useState('');
  const [guestContact, setGuestContact] = useState('');
  const [note, setNote] = useState('');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [housekeepingServices, setHousekeepingServices] = useState<string[]>([]);

  const HOUSEKEEPING_SERVICES = [
    { id: 'room_cleaning', label: 'Room Cleaning (Full Service)' },
    { id: 'fresh_towels', label: 'Fresh Towels' },
    { id: 'fresh_linens', label: 'Fresh Bed Linens' },
    { id: 'toiletries', label: 'Toiletries Refill' },
    { id: 'minibar', label: 'Minibar Restock' },
    { id: 'pillows', label: 'Extra Pillows & Blankets' },
    { id: 'trash', label: 'Trash Removal' },
    { id: 'vacuum', label: 'Vacuum Cleaning' },
  ];

  const toggleService = (serviceId: string) => {
    setHousekeepingServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Phase 3: Enhanced validation and logging
    if (!token || !service || !qrData?.tenant_id) {
      console.error('[QRServiceRequestForm] Missing required data:', {
        has_token: !!token,
        has_service: !!service,
        has_tenant_id: !!qrData?.tenant_id,
      });
      toast.error('Session not ready. Please wait and try again.');
      return;
    }

    try {
      // For housekeeping, use selected services as note
      const finalNote = service === 'housekeeping' 
        ? JSON.stringify(housekeepingServices)
        : note;

      console.log('[QRServiceRequestForm] Submitting request:', {
        service,
        priority,
        has_note: !!finalNote,
        tenant_id: qrData.tenant_id,
      });

      const request = await createRequest({
        qr_token: token,
        type: service,
        note: finalNote,
        priority,
        guest_name: guestName || 'Guest',
        guest_contact: guestContact,
        guest_session_token: guestSessionToken || undefined, // GUEST-SESSION-SECURITY: Include session token
      });

      if (request) {
        console.log('[QRServiceRequestForm] Request created, navigating to chat:', request.id);
        navigate(`/qr/${token}/chat/${request.id}`);
      } else {
        console.error('[QRServiceRequestForm] Request creation returned null');
      }
    } catch (err: any) {
      console.error('[QRServiceRequestForm] Unexpected error in handleSubmit:', {
        message: err?.message,
        error: err,
      });
      toast.error(`Error: ${err?.message || 'Failed to submit request'}`);
    }
  };

  if (!qrData || !qrData.tenant_id) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading your session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/qr/${token}`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold capitalize">
              {service?.replace('_', ' ')} Request
            </h1>
            <p className="text-muted-foreground">Fill in the details below</p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Request Details</CardTitle>
            <CardDescription>
              We'll get back to you as soon as possible
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="guestName">Your Name (Optional)</Label>
                <Input
                  id="guestName"
                  placeholder="Enter your name"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="guestContact">Contact (Optional)</Label>
                <Input
                  id="guestContact"
                  placeholder="Phone or room extension"
                  value={guestContact}
                  onChange={(e) => setGuestContact(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {service === 'housekeeping' ? (
                <div className="space-y-3">
                  <Label>Select Services</Label>
                  <div className="grid gap-3">
                    {HOUSEKEEPING_SERVICES.map(item => (
                      <Card
                        key={item.id}
                        className={`cursor-pointer transition-all border-2 ${
                          housekeepingServices.includes(item.id)
                            ? 'border-accent bg-accent/5'
                            : 'border-border hover:border-accent/50'
                        }`}
                        onClick={() => toggleService(item.id)}
                      >
                        <CardContent className="flex items-center gap-3 p-4">
                          <Checkbox
                            checked={housekeepingServices.includes(item.id)}
                            onCheckedChange={() => toggleService(item.id)}
                          />
                          <span className="font-medium">{item.label}</span>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="note">Details</Label>
                  <Textarea
                    id="note"
                    placeholder="Describe your request..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={4}
                    required
                  />
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                disabled={isCreating || (service === 'housekeeping' && housekeepingServices.length === 0) || (service !== 'housekeeping' && !note) || !qrData?.tenant_id}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Submit Request
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
