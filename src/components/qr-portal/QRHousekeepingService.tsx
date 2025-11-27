import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useQRToken } from '@/hooks/useQRToken';
import { useGuestInfo } from '@/hooks/useGuestInfo';
import { useGuestSessionContext } from '@/components/qr-portal/QRPortalWrapper'; // GUEST-SESSION-SECURITY
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const CLEANING_TYPES = [
  { value: 'full_clean', label: 'Full Cleaning', description: 'Complete room cleaning service' },
  { value: 'refresh', label: 'Quick Refresh', description: 'Quick tidy and bed making' },
  { value: 'turndown', label: 'Turndown Service', description: 'Evening preparation service' },
  { value: 'deep_clean', label: 'Deep Cleaning', description: 'Thorough deep cleaning' },
];

const CLEANING_ITEMS = [
  { id: 'fresh_towels', label: 'Fresh Towels' },
  { id: 'fresh_linens', label: 'Fresh Linens & Bedding' },
  { id: 'toiletries', label: 'Toiletries Refill' },
  { id: 'vacuum', label: 'Vacuum Cleaning' },
  { id: 'bathroom', label: 'Bathroom Deep Clean' },
  { id: 'dust', label: 'Dusting & Surfaces' },
  { id: 'trash', label: 'Trash Removal' },
  { id: 'minibar', label: 'Minibar Restock' },
];

export function QRHousekeepingService() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { qrData } = useQRToken(token);
  const { guestInfo, saveGuestInfo } = useGuestInfo(token);
  const { guestSessionToken } = useGuestSessionContext(); // GUEST-SESSION-SECURITY
  
  const [cleaningType, setCleaningType] = useState('full_clean');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [preferredTime, setPreferredTime] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [guestName, setGuestName] = useState(guestInfo?.name || '');
  const [guestPhone, setGuestPhone] = useState(guestInfo?.phone || '');

  const createHousekeepingRequest = useMutation({
    mutationFn: async () => {
      if (!token || !qrData?.tenant_id) {
        console.error('[QRHousekeepingService] Missing required data:', {
          has_token: !!token,
          has_tenant_id: !!qrData?.tenant_id,
        });
        toast.error('Session not ready. Please wait and try again.');
        return;
      }

      const cleaningTypeLabel = CLEANING_TYPES.find(t => t.value === cleaningType)?.label || cleaningType;
      const selectedItemLabels = selectedItems
        .map(id => CLEANING_ITEMS.find(item => item.id === id)?.label)
        .filter(Boolean);

      const note = [
        `Housekeeping Request: ${cleaningTypeLabel}`,
        selectedItemLabels.length > 0 ? `Items: ${selectedItemLabels.join(', ')}` : '',
        preferredTime ? `Preferred Time: ${preferredTime}` : '',
        specialInstructions ? `Instructions: ${specialInstructions}` : '',
      ].filter(Boolean).join(' | ');

      console.log('[QRHousekeepingService] Creating request:', {
        cleaning_type: cleaningType,
        items_count: selectedItems.length,
        tenant_id: qrData?.tenant_id,
      });

      const { data, error } = await supabase.functions.invoke('qr-request', {
        body: {
          action: 'create_request',
          type: 'housekeeping',
          qr_token: token,
          guest_name: guestName.trim() || 'Guest',
          guest_contact: guestPhone.trim(),
          guest_session_token: guestSessionToken, // GUEST-SESSION-SECURITY: Include session token
          service_category: 'housekeeping',
          note,
          priority: 'normal',
          metadata: {
            cleaning_type: cleaningType,
            selected_items: selectedItems,
            preferred_time: preferredTime || null,
            special_instructions: specialInstructions || null,
            payment_info: {
              billable: false,
            },
          },
        },
      });

      const request = data?.request;

      if (error) {
        console.error('[QRHousekeepingService] Request insert error:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        throw error;
      }

      console.log('[QRHousekeepingService] Request created:', request.id);
      return request;
    },
    onSuccess: (data) => {
      // Save guest info to localStorage for future use
      if (guestName.trim() || guestPhone.trim()) {
        saveGuestInfo(guestName.trim() || 'Guest', guestPhone.trim());
      }
      toast.success('Housekeeping request submitted successfully!');
      if (data) {
        console.log('[QRHousekeepingService] Navigating to chat:', data.id);
        navigate(`/qr/${token}/chat/${data.id}`);
      }
    },
    onError: (error: any) => {
      console.error('[QRHousekeepingService] Mutation error:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        error,
      });
      toast.error(`Error: ${error?.message || 'Failed to submit housekeeping request'}`);
    },
  });

  const toggleItem = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
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
              <Sparkles className="h-5 w-5 text-primary" />
              Housekeeping Service
            </h1>
            <p className="text-sm text-muted-foreground">{qrData?.tenant?.hotel_name}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <Card className="shadow-xl border-2 border-primary/10">
          <CardHeader>
            <CardTitle className="font-display text-2xl">Request Housekeeping</CardTitle>
            <CardDescription>
              Select the type of service you need and any specific items
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Cleaning Type Selection */}
            <div className="space-y-3">
              <Label htmlFor="cleaning-type" className="text-base font-semibold">
                Service Type
              </Label>
              <Select value={cleaningType} onValueChange={setCleaningType}>
                <SelectTrigger id="cleaning-type" className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLEANING_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex flex-col">
                        <span className="font-medium">{type.label}</span>
                        <span className="text-xs text-muted-foreground">{type.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Specific Items */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                Specific Items (Optional)
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CLEANING_ITEMS.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/5 transition-all cursor-pointer"
                    onClick={() => toggleItem(item.id)}
                  >
                    <Checkbox
                      id={item.id}
                      checked={selectedItems.includes(item.id)}
                      onCheckedChange={() => toggleItem(item.id)}
                    />
                    <Label htmlFor={item.id} className="cursor-pointer flex-1">
                      {item.label}
                    </Label>
                    {selectedItems.includes(item.id) && (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Preferred Time */}
            <div className="space-y-3">
              <Label htmlFor="preferred-time" className="text-base font-semibold">
                Preferred Time (Optional)
              </Label>
              <input
                id="preferred-time"
                type="time"
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                className="flex h-12 w-full rounded-lg border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              <p className="text-sm text-muted-foreground">
                We'll do our best to accommodate your preferred time
              </p>
            </div>

            {/* Guest Information */}
            <div className="space-y-4">
              <h3 className="text-base font-semibold">Contact Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="guest-name">Your Name</Label>
                  <Input
                    id="guest-name"
                    placeholder="Enter your name"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guest-phone">Phone Number</Label>
                  <Input
                    id="guest-phone"
                    type="tel"
                    placeholder="+234 xxx xxx xxxx"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Special Instructions */}
            <div className="space-y-3">
              <Label htmlFor="instructions" className="text-base font-semibold">
                Special Instructions (Optional)
              </Label>
              <Textarea
                id="instructions"
                placeholder="Any specific requests or areas that need attention..."
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            {/* Submit Button */}
            <Button
              size="lg"
              className="w-full"
              onClick={() => createHousekeepingRequest.mutate()}
              disabled={createHousekeepingRequest.isPending || !qrData?.tenant_id}
            >
              {createHousekeepingRequest.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Submitting Request...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  Submit Housekeeping Request
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground text-center">
              Our housekeeping team will receive your request immediately and will be with you shortly
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default QRHousekeepingService;
