import { useRef } from 'react';
import QRCode from 'qrcode.react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer, Download } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface QRPrintTemplateProps {
  qrCode: {
    id: string;
    token: string;
    display_name: string;
    scope: string;
    assigned_to: string;
    room?: { number: string };
  };
  branding?: {
    hotel_name?: string;
    logo_url?: string;
    primary_color?: string;
    contact_phone?: string;
  };
  template?: 'card' | 'tent' | 'sticker' | 'poster';
}

export default function QRPrintTemplate({ 
  qrCode, 
  branding,
  template = 'card' 
}: QRPrintTemplateProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const { tenantId } = useAuth();

  const qrUrl = `${window.location.origin}/qr/${qrCode.token}`;

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Print QR Code - ${qrCode.display_name}</title>
          <style>
            @media print {
              body { margin: 0; padding: 20px; }
              @page { size: auto; margin: 0; }
            }
            body { 
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleDownload = () => {
    const canvas = document.querySelector('#qr-canvas-' + qrCode.id) as HTMLCanvasElement;
    if (!canvas) return;

    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = `qr-${qrCode.assigned_to || qrCode.scope}.png`;
    link.click();
  };

  const renderTemplate = () => {
    const primaryColor = branding?.primary_color || 'hsl(var(--primary))';

    switch (template) {
      case 'tent':
        return (
          <div className="w-[600px] h-[400px] bg-background border-2 border-border rounded-lg p-8 flex flex-col items-center justify-between">
            {branding?.logo_url && (
              <img src={branding.logo_url} alt="Logo" className="h-16 object-contain" />
            )}
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-display font-bold" style={{ color: primaryColor }}>
                {qrCode.display_name}
              </h2>
              {qrCode.room && (
                <p className="text-xl text-muted-foreground">Room {qrCode.room.number}</p>
              )}
            </div>
            <div className="bg-white p-4 rounded-lg">
              <QRCode
                id={'qr-canvas-' + qrCode.id}
                value={qrUrl}
                size={180}
                level="H"
                includeMargin
              />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Scan to access room services
            </p>
          </div>
        );

      case 'sticker':
        return (
          <div className="w-[300px] h-[300px] bg-background border-2 border-border rounded-full p-6 flex flex-col items-center justify-center">
            <div className="bg-white p-3 rounded-lg mb-3">
              <QRCode
                id={'qr-canvas-' + qrCode.id}
                value={qrUrl}
                size={160}
                level="H"
                includeMargin
              />
            </div>
            <p className="text-xs font-semibold text-center" style={{ color: primaryColor }}>
              {qrCode.room ? `Room ${qrCode.room.number}` : qrCode.scope.toUpperCase()}
            </p>
          </div>
        );

      case 'poster':
        return (
          <div className="w-[800px] h-[1000px] bg-gradient-to-br from-background to-muted p-12 flex flex-col items-center justify-between">
            {branding?.logo_url && (
              <img src={branding.logo_url} alt="Logo" className="h-24 object-contain" />
            )}
            <div className="text-center space-y-8">
              <h1 className="text-6xl font-display font-bold" style={{ color: primaryColor }}>
                {branding?.hotel_name || 'Hotel Services'}
              </h1>
              <h2 className="text-4xl text-foreground">
                {qrCode.display_name}
              </h2>
              {qrCode.room && (
                <p className="text-3xl text-muted-foreground">Room {qrCode.room.number}</p>
              )}
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-xl">
              <QRCode
                id={'qr-canvas-' + qrCode.id}
                value={qrUrl}
                size={400}
                level="H"
                includeMargin
              />
            </div>
            <div className="text-center space-y-4">
              <p className="text-2xl font-semibold">Scan for Room Services</p>
              <p className="text-lg text-muted-foreground">
                Housekeeping • Room Service • Maintenance
              </p>
              {branding?.contact_phone && (
                <p className="text-lg text-muted-foreground">
                  Call: {branding.contact_phone}
                </p>
              )}
            </div>
          </div>
        );

      default: // card
        return (
          <div className="w-[400px] h-[600px] bg-background border-2 border-border rounded-xl p-8 flex flex-col items-center justify-between">
            {branding?.logo_url && (
              <img src={branding.logo_url} alt="Logo" className="h-20 object-contain" />
            )}
            <div className="text-center space-y-3">
              <h2 className="text-2xl font-display font-bold" style={{ color: primaryColor }}>
                {qrCode.display_name}
              </h2>
              {qrCode.room && (
                <p className="text-xl text-muted-foreground">Room {qrCode.room.number}</p>
              )}
              <p className="text-sm text-muted-foreground capitalize">
                {qrCode.scope.replace('_', ' ')} Services
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <QRCode
                id={'qr-canvas-' + qrCode.id}
                value={qrUrl}
                size={220}
                level="H"
                includeMargin
              />
            </div>
            <div className="text-center space-y-2">
              <p className="text-base font-semibold">Scan to Access Services</p>
              <p className="text-xs text-muted-foreground">
                Available 24/7
              </p>
              {branding?.contact_phone && (
                <p className="text-xs text-muted-foreground">
                  Emergency: {branding.contact_phone}
                </p>
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button onClick={handlePrint} size="sm">
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
        <Button onClick={handleDownload} size="sm" variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Download QR
        </Button>
      </div>

      <Card className="p-8 flex items-center justify-center bg-muted/30">
        <div ref={printRef}>
          {renderTemplate()}
        </div>
      </Card>
    </div>
  );
}
