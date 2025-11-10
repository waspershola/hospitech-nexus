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
import { QRSizeSelector, QRSize } from '@/components/qr-management/QRSizeSelector';
import { QRPrintableView } from '@/components/qr-management/QRPrintableView';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, Layers } from 'lucide-react';

export default function QRPrintables() {
  const { tenantId } = useAuth();
  const { qrCodes, isLoading, deleteQRCode } = useQRManagement();
  const [selectedQR, setSelectedQR] = useState<string>('');
  const [qrSize, setQrSize] = useState<QRSize>('medium');
  const [showPrintView, setShowPrintView] = useState(false);

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

  const handleDelete = async () => {
    if (selectedQRCode && window.confirm(`Delete QR code for ${selectedQRCode.display_name}?`)) {
      await deleteQRCode(selectedQRCode.id);
      setSelectedQR('');
      setShowPrintView(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  // Show full print view when preview is clicked
  if (showPrintView && selectedQRCode) {
    return (
      <div className="space-y-6">
        <QRPrintableView
          qrCode={selectedQRCode}
          branding={branding || undefined}
          size={qrSize}
          onBack={() => setShowPrintView(false)}
          onDelete={handleDelete}
        />
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
          Select a QR code, choose size, and export as PNG or PDF
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

            {/* QR Size Selector */}
            <QRSizeSelector
              value={qrSize}
              onChange={setQrSize}
              disabled={!selectedQR}
            />

            {/* Preview Button */}
            {selectedQR && (
              <Button
                onClick={() => setShowPrintView(true)}
                className="w-full gap-2"
                size="lg"
              >
                <Eye className="h-4 w-4" />
                Open Print Preview
              </Button>
            )}

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

        {/* Quick Preview Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quick Preview</CardTitle>
              <CardDescription>
                Preview before printing or exporting
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedQRCode ? (
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-background to-muted/30 rounded-lg border p-8 flex items-center justify-center min-h-[400px]">
                    <div className="text-center space-y-4">
                      <div className="w-32 h-32 mx-auto bg-white rounded-lg border-4 border-primary/20 flex items-center justify-center">
                        <div className="text-4xl font-bold text-primary">QR</div>
                      </div>
                      <div>
                        <h3 className="text-xl font-serif font-bold text-foreground">
                          {selectedQRCode.display_name}
                        </h3>
                        {selectedQRCode.room_id && (
                          <p className="text-muted-foreground">Room {selectedQRCode.room_id}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 justify-center text-xs text-muted-foreground">
                        <span className="px-2 py-1 bg-muted rounded">Size: {qrSize}</span>
                        <span className="px-2 py-1 bg-muted rounded">{selectedQRCode.scope}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Click "Open Print Preview" to see full size and export options
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-center h-96">
                  <div className="text-center text-muted-foreground">
                    <Layers className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-lg font-semibold mb-2">No QR Code Selected</p>
                    <p className="text-sm">Select a QR code to preview</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
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
