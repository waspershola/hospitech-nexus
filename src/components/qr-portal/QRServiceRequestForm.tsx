import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQRRequest } from '@/hooks/useQRRequest';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Send } from 'lucide-react';

export function QRServiceRequestForm() {
  const { token, service } = useParams<{ token: string; service: string }>();
  const navigate = useNavigate();
  const { qrToken } = useAuth();
  const { isCreating, createRequest } = useQRRequest();

  const [guestName, setGuestName] = useState('');
  const [guestContact, setGuestContact] = useState('');
  const [note, setNote] = useState('');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token || !service) return;

    const request = await createRequest({
      qr_token: token,
      type: service,
      service_category: service,
      note,
      priority,
      guest_name: guestName || 'Guest',
      guest_contact: guestContact,
    });

    if (request) {
      // Navigate to chat view
      navigate(`/qr/${token}/chat/${request.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
      <div className="max-w-2xl mx-auto space-y-6 py-8">
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

              <Button type="submit" className="w-full" disabled={isCreating}>
                {isCreating ? (
                  'Submitting...'
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
