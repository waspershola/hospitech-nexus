import { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer, Download, FileImage, FileText, ArrowLeft, Trash2, Crown, Smartphone } from 'lucide-react';
import { QRSize } from './QRSizeSelector';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';

interface QRPrintableViewProps {
  qrCode: {
    id: string;
    token: string;
    display_name: string;
    scope: string;
    assigned_to: string;
    room_id?: string | null;
    services?: string[];
  };
  branding?: {
    hotel_name?: string;
    logo_url?: string;
    primary_color?: string;
    contact_phone?: string;
  };
  size: QRSize;
  onBack?: () => void;
  onDelete?: () => void;
}

const SIZE_CONFIG = {
  small: { width: 400, height: 400, qrSize: 200, fontSize: 'small' },
  medium: { width: 600, height: 600, qrSize: 300, fontSize: 'medium' },
  large: { width: 800, height: 800, qrSize: 400, fontSize: 'large' },
  poster: { width: 1200, height: 1200, qrSize: 600, fontSize: 'xlarge' },
};

export function QRPrintableView({
  qrCode,
  branding,
  size,
  onBack,
  onDelete,
}: QRPrintableViewProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  const qrUrl = `${window.location.origin}/qr/${qrCode.token}`;
  const config = SIZE_CONFIG[size];

  // Get service badges
  const services = qrCode.services || ['WiFi', 'Room Service', 'Housekeeping', 'Maintenance'];
  const displayedServices = services.slice(0, 6);
  const remainingCount = services.length - displayedServices.length;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPNG = async () => {
    const element = printRef.current;
    if (!element) return;

    setIsExporting(true);
    try {
      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
      });

      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = url;
      link.download = `qr-${qrCode.assigned_to || qrCode.display_name}-${size}.png`;
      link.click();

      toast.success('QR code downloaded as PNG');
    } catch (error) {
      console.error('PNG export error:', error);
      toast.error('Failed to export PNG');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPDF = async () => {
    const element = printRef.current;
    if (!element) return;

    setIsExporting(true);
    try {
      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2],
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`qr-${qrCode.assigned_to || qrCode.display_name}-${size}.pdf`);

      toast.success('QR code downloaded as PDF');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      <div className="flex items-center justify-between gap-2 no-print">
        <div className="flex gap-2">
          {onBack && (
            <Button onClick={onBack} variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Preview
            </Button>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button onClick={handlePrint} size="sm" disabled={isExporting}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button onClick={handleDownloadPNG} size="sm" variant="outline" disabled={isExporting}>
            <FileImage className="h-4 w-4 mr-2" />
            PNG
          </Button>
          <Button onClick={handleDownloadPDF} size="sm" variant="outline" disabled={isExporting}>
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {/* Professional QR Code Layout */}
      <Card className="overflow-hidden print:shadow-none print:border-0 print:m-0">
        <CardContent className="p-0 flex items-center justify-center bg-gradient-to-br from-background to-muted/30 print:bg-white print-container">
          <div
            ref={printRef}
            className="bg-white p-12 flex flex-col items-center justify-center print:mx-auto"
            style={{
              width: `${config.width}px`,
              minHeight: `${config.height}px`,
            }}
          >
            {/* Hotel Logo */}
            {branding?.logo_url && (
              <div className="mb-8">
                <img
                  src={branding.logo_url}
                  alt="Hotel Logo"
                  className={`object-contain ${
                    size === 'poster' ? 'h-32' : size === 'large' ? 'h-24' : size === 'medium' ? 'h-20' : 'h-16'
                  }`}
                />
              </div>
            )}

            {/* Hotel Name */}
            <h1
              className={`font-serif font-bold text-center mb-2 ${
                size === 'poster' ? 'text-5xl' : size === 'large' ? 'text-4xl' : size === 'medium' ? 'text-3xl' : 'text-2xl'
              }`}
              style={{ color: branding?.primary_color || 'hsl(217 91% 60%)' }}
            >
              {branding?.hotel_name || 'Luxury Hotel'}
            </h1>

            {/* Location/Room */}
            <p
              className={`text-muted-foreground mb-8 ${
                size === 'poster' ? 'text-2xl' : size === 'large' ? 'text-xl' : size === 'medium' ? 'text-lg' : 'text-base'
              }`}
            >
              {qrCode.room_id ? `Room ${qrCode.room_id}` : qrCode.display_name}
            </p>

            {/* QR Code Container */}
            <div
              className="bg-white border-4 rounded-2xl shadow-xl mb-8 p-6"
              style={{
                borderColor: branding?.primary_color || 'hsl(217 91% 60%)',
              }}
            >
              <QRCodeSVG
                value={qrUrl}
                size={config.qrSize}
                level="H"
                includeMargin={false}
                style={{ display: 'block' }}
              />
            </div>

            {/* Available Services Section */}
            <div className="text-center mb-6 w-full max-w-2xl">
              <h2
                className={`font-serif font-semibold mb-4 ${
                  size === 'poster' ? 'text-3xl' : size === 'large' ? 'text-2xl' : size === 'medium' ? 'text-xl' : 'text-lg'
                }`}
              >
                Available Services
              </h2>
              <div className="flex flex-wrap gap-2 justify-center">
                {displayedServices.map((service, idx) => (
                  <span
                    key={idx}
                    className={`inline-flex items-center px-4 py-2 rounded-full bg-gray-100 text-gray-700 font-medium ${
                      size === 'poster' ? 'text-lg' : size === 'large' ? 'text-base' : 'text-sm'
                    }`}
                  >
                    {service}
                  </span>
                ))}
                {remainingCount > 0 && (
                  <span
                    className={`inline-flex items-center px-4 py-2 rounded-full bg-gray-100 text-gray-700 font-medium ${
                      size === 'poster' ? 'text-lg' : size === 'large' ? 'text-base' : 'text-sm'
                    }`}
                  >
                    + {remainingCount} more
                  </span>
                )}
              </div>
            </div>

            {/* Scan Instructions */}
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Smartphone
                  className={size === 'poster' ? 'h-8 w-8' : size === 'large' ? 'h-6 w-6' : 'h-5 w-5'}
                />
                <p
                  className={`font-semibold ${
                    size === 'poster' ? 'text-2xl' : size === 'large' ? 'text-xl' : size === 'medium' ? 'text-lg' : 'text-base'
                  }`}
                >
                  Scan with your phone camera
                </p>
              </div>
              <p
                className={`text-muted-foreground ${
                  size === 'poster' ? 'text-xl' : size === 'large' ? 'text-lg' : size === 'medium' ? 'text-base' : 'text-sm'
                }`}
              >
                Access all services instantly • Available 24/7
              </p>
              {branding?.contact_phone && (
                <p
                  className={`text-muted-foreground ${
                    size === 'poster' ? 'text-lg' : size === 'large' ? 'text-base' : 'text-sm'
                  }`}
                >
                  Need assistance? Call {branding.contact_phone}
                </p>
              )}
            </div>

            {/* Footer Branding */}
            <div className="mt-8 pt-6 border-t border-border/30 w-full text-center">
              <p className="text-xs text-muted-foreground/70">Powered by luxuryhotelpro.com</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Button */}
      {onDelete && (
        <div className="flex justify-end no-print">
          <Button onClick={onDelete} variant="destructive" size="sm">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete QR Code
          </Button>
        </div>
      )}
    </div>
  );
}
