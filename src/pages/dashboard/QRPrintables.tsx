import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQRManagement } from '@/hooks/useQRManagement';
import { Skeleton } from '@/components/ui/skeleton';
import QRPrintTemplate from '@/components/qr-management/QRPrintTemplate';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type TemplateType = 'card' | 'tent' | 'sticker' | 'poster';

export default function QRPrintables() {
  const { tenantId } = useAuth();
  const { qrCodes, isLoading } = useQRManagement();
  const [selectedQR, setSelectedQR] = useState<string>('');
  const [template, setTemplate] = useState<TemplateType>('card');

  // Fetch branding info
  const { data: branding } = useQuery({
    queryKey: ['hotel-branding', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      const [brandingResult, metaResult] = await Promise.all([
        supabase
          .from('hotel_branding')
          .select('logo_url, primary_color')
          .eq('tenant_id', tenantId)
          .single(),
        supabase
          .from('hotel_meta')
          .select('hotel_name, contact_phone')
          .eq('tenant_id', tenantId)
          .single(),
      ]);

      return {
        logo_url: brandingResult.data?.logo_url,
        primary_color: brandingResult.data?.primary_color,
        hotel_name: metaResult.data?.hotel_name,
        contact_phone: metaResult.data?.contact_phone,
      };
    },
    enabled: !!tenantId,
  });

  const selectedQRCode = qrCodes?.find(qr => qr.id === selectedQR);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">
          Printable QR Codes
        </h1>
        <p className="text-muted-foreground mt-1">
          Create and print customized QR code templates
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Configuration Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Template Configuration</CardTitle>
            <CardDescription>
              Select a QR code and customize the print template
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Select QR Code</Label>
              <Select value={selectedQR} onValueChange={setSelectedQR}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a QR code..." />
                </SelectTrigger>
                <SelectContent>
                  {qrCodes?.map(qr => (
                    <SelectItem key={qr.id} value={qr.id}>
                      {qr.display_name}
                      {qr.room_id && ` - Room ${qr.room_id}`}
                      {` (${qr.scope})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Template Style</Label>
              <Select 
                value={template} 
                onValueChange={(value) => setTemplate(value as TemplateType)}
                disabled={!selectedQR}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="card">Standard Card (4x6")</SelectItem>
                  <SelectItem value="tent">Table Tent Card</SelectItem>
                  <SelectItem value="sticker">Round Sticker</SelectItem>
                  <SelectItem value="poster">Large Poster</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 bg-muted rounded-lg space-y-2">
              <p className="text-sm font-semibold">Template Details:</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                {template === 'card' && (
                  <>
                    <li>• Size: 4" x 6" (standard postcard)</li>
                    <li>• Best for: Room placement, door hangers</li>
                    <li>• Includes: Logo, room info, QR code</li>
                  </>
                )}
                {template === 'tent' && (
                  <>
                    <li>• Size: 6" x 4" (horizontal fold)</li>
                    <li>• Best for: Table displays, counters</li>
                    <li>• Includes: Logo, title, QR code</li>
                  </>
                )}
                {template === 'sticker' && (
                  <>
                    <li>• Size: 3" diameter (round)</li>
                    <li>• Best for: Windows, mirrors, surfaces</li>
                    <li>• Includes: QR code, room number</li>
                  </>
                )}
                {template === 'poster' && (
                  <>
                    <li>• Size: 8" x 10" (large format)</li>
                    <li>• Best for: Lobby, elevators, hallways</li>
                    <li>• Includes: Full branding, services list</li>
                  </>
                )}
              </ul>
            </div>

            {selectedQRCode && (
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
                <p className="text-sm font-semibold text-primary">Selected QR Code:</p>
                <div className="text-xs space-y-1">
                  <p><strong>Name:</strong> {selectedQRCode.display_name}</p>
                  <p><strong>Scope:</strong> {selectedQRCode.scope}</p>
                  <p><strong>Assigned to:</strong> {selectedQRCode.assigned_to}</p>
                  {selectedQRCode.room_id && (
                    <p><strong>Room:</strong> {selectedQRCode.room_id}</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preview Panel */}
        <div className="space-y-4">
          {selectedQRCode ? (
            <QRPrintTemplate
              qrCode={selectedQRCode}
              branding={branding || undefined}
              template={template}
            />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-96">
                <div className="text-center text-muted-foreground">
                  <p className="text-lg font-semibold mb-2">No QR Code Selected</p>
                  <p className="text-sm">Select a QR code to preview the template</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Bulk Print Section */}
      <Card>
        <CardHeader>
          <CardTitle>Bulk Print</CardTitle>
          <CardDescription>
            Print multiple QR codes at once for room distribution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-semibold mb-2">All Rooms</p>
                <p className="text-xs text-muted-foreground mb-3">
                  {qrCodes?.filter(qr => qr.scope === 'room').length || 0} room QR codes
                </p>
                <Button size="sm" variant="outline" className="w-full">
                  Print All Rooms
                </Button>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-semibold mb-2">Common Areas</p>
                <p className="text-xs text-muted-foreground mb-3">
                  {qrCodes?.filter(qr => qr.scope === 'common_area').length || 0} area QR codes
                </p>
                <Button size="sm" variant="outline" className="w-full">
                  Print All Areas
                </Button>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-semibold mb-2">All QR Codes</p>
                <p className="text-xs text-muted-foreground mb-3">
                  {qrCodes?.length || 0} total QR codes
                </p>
                <Button size="sm" variant="outline" className="w-full">
                  Print Everything
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              * Bulk printing will open multiple print dialogs. Make sure your printer is ready.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
