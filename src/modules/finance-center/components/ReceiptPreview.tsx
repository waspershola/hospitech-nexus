import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { ReceiptSettings } from '@/hooks/useReceiptSettings';

interface ReceiptPreviewProps {
  settings: ReceiptSettings | undefined;
  onClose: () => void;
}

export function ReceiptPreview({ settings, onClose }: ReceiptPreviewProps) {
  const paperWidth = settings?.paper_size === '58mm' ? 'max-w-[220px]' 
                    : settings?.paper_size === '80mm' ? 'max-w-[300px]'
                    : settings?.paper_size === 'A5' ? 'max-w-[148mm]'
                    : 'max-w-[210mm]';

  const textAlign = settings?.alignment || 'center';
  const fontSize = settings?.font_size === 'small' ? 'text-xs' 
                  : settings?.font_size === 'large' ? 'text-base'
                  : 'text-sm';

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Receipt Preview - {settings?.paper_size}</DialogTitle>
        </DialogHeader>
        
        <div className="flex justify-center bg-muted/30 p-8 rounded-lg">
          <Card className={`${paperWidth} ${fontSize} p-4 bg-background shadow-2xl`}>
            {/* Header */}
            <div className={`text-${textAlign} space-y-1`}>
              {settings?.logo_url && (
                <img src={settings.logo_url} alt="Logo" className="h-12 mx-auto mb-2" />
              )}
              <p className="font-bold text-base">THE HAVEN HOTEL</p>
              <p className="text-xs">Front Desk - Lagos Branch</p>
              <p className="text-xs">+234 123 456 7890</p>
              {settings?.header_text && (
                <p className="text-xs mt-2 font-medium">{settings.header_text}</p>
              )}
            </div>

            <Separator className="my-3" />

            {/* Sample Transaction Details */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Guest:</span>
                <span className="font-medium">John Doe</span>
              </div>
              <div className="flex justify-between">
                <span>Room:</span>
                <span className="font-medium">204</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span className="font-medium">{new Date().toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Receipt #:</span>
                <span className="font-medium">RCP-2025-001234</span>
              </div>
            </div>

            <Separator className="my-3" />

            {/* Line Items */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Room Charge (2 nights)</span>
                <span>₦20,000.00</span>
              </div>
              <div className="flex justify-between">
                <span>Restaurant</span>
                <span>₦3,650.00</span>
              </div>
            </div>

            <Separator className="my-2" />

            {/* Totals */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₦23,650.00</span>
              </div>
              
              {settings?.show_vat_breakdown && (
                <div className="flex justify-between text-xs">
                  <span>VAT (7.5%):</span>
                  <span>₦1,773.75</span>
                </div>
              )}
              
              {settings?.include_service_charge && (
                <div className="flex justify-between text-xs">
                  <span>Service Charge (10%):</span>
                  <span>₦2,365.00</span>
                </div>
              )}

              {settings?.show_provider_fee && (
                <div className="flex justify-between text-xs">
                  <span>Provider Fee (1.5%):</span>
                  <span>₦354.75</span>
                </div>
              )}
            </div>

            <Separator className="my-2" />

            <div className="flex justify-between font-bold text-base">
              <span>TOTAL:</span>
              <span>₦28,143.50</span>
            </div>

            <Separator className="my-3" />

            {/* Payment Method */}
            <div className={`text-${textAlign} text-xs space-y-1`}>
              <p>Paid via: OPAY POS</p>
              <p>Status: Success</p>
            </div>

            <Separator className="my-3" />

            {/* Footer */}
            <div className={`text-${textAlign} text-xs space-y-2`}>
              {settings?.footer_text && (
                <p className="font-medium">{settings.footer_text}</p>
              )}
              <p>www.havenhotel.ng</p>
              
              {settings?.show_qr_code && (
                <div className="flex justify-center mt-2">
                  <div className="w-16 h-16 bg-muted flex items-center justify-center text-[8px]">
                    QR CODE
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
