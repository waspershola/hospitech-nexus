import { format } from 'date-fns';
import type { ReceiptSettings } from '@/hooks/useReceiptSettings';
import type { Payment } from '@/hooks/usePayments';

interface ReceiptDocumentProps {
  payment: Payment;
  settings: ReceiptSettings;
  guestName?: string;
  bookingRef?: string;
  roomNumber?: string;
}

export function ReceiptDocument({
  payment,
  settings,
  guestName,
  bookingRef,
  roomNumber,
}: ReceiptDocumentProps) {
  const paperWidth = settings.paper_size === 'A4' ? '210mm' : 
                     settings.paper_size === 'A5' ? '148mm' :
                     settings.paper_size === '58mm' ? '58mm' : '80mm';

  const fontSizeClass = settings.font_size === 'small' ? 'text-xs' :
                        settings.font_size === 'large' ? 'text-base' : 'text-sm';

  const alignmentClass = settings.alignment === 'left' ? 'text-left' :
                         settings.alignment === 'right' ? 'text-right' : 'text-center';

  return (
    <div 
      className={`font-mono ${fontSizeClass} ${alignmentClass} bg-white text-black p-4`}
      style={{ maxWidth: paperWidth }}
    >
      {/* Header with Logo */}
      {settings.logo_url && (
        <div className="flex justify-center mb-4">
          <img 
            src={settings.logo_url} 
            alt="Logo" 
            className="max-w-[120px] max-h-[60px] object-contain"
          />
        </div>
      )}

      {/* Header Text */}
      {settings.header_text && (
        <div className="font-bold mb-2 border-b-2 border-dashed border-black pb-2">
          {settings.header_text}
        </div>
      )}

      {/* Receipt Details */}
      <div className="my-4 space-y-1">
        <div className="flex justify-between">
          <span>Date:</span>
          <span>{format(new Date(payment.created_at), 'dd/MM/yyyy HH:mm')}</span>
        </div>
        <div className="flex justify-between">
          <span>Receipt #:</span>
          <span className="font-bold">{payment.transaction_ref || payment.id.substring(0, 8)}</span>
        </div>
        {bookingRef && (
          <div className="flex justify-between">
            <span>Booking:</span>
            <span>{bookingRef}</span>
          </div>
        )}
        {roomNumber && (
          <div className="flex justify-between">
            <span>Room:</span>
            <span>{roomNumber}</span>
          </div>
        )}
        {guestName && (
          <div className="flex justify-between">
            <span>Guest:</span>
            <span>{guestName}</span>
          </div>
        )}
      </div>

      {/* Payment Details */}
      <div className="border-t border-b border-dashed border-gray-400 py-3 my-3">
        <div className="flex justify-between mb-2">
          <span>Payment Method:</span>
          <span className="uppercase">{payment.method || 'N/A'}</span>
        </div>
        {payment.method_provider && (
          <div className="flex justify-between mb-2">
            <span>Provider:</span>
            <span>{payment.method_provider}</span>
          </div>
        )}
        {payment.provider_reference && (
          <div className="flex justify-between text-xs">
            <span>Provider Ref:</span>
            <span>{payment.provider_reference}</span>
          </div>
        )}
      </div>

      {/* Amount Breakdown */}
      <div className="space-y-2 my-4">
        <div className="flex justify-between text-lg font-bold">
          <span>Amount Paid:</span>
          <span>{payment.currency} {Number(payment.amount).toFixed(2)}</span>
        </div>
        
        {settings.show_vat_breakdown && payment.metadata?.vat && (
          <div className="flex justify-between text-xs">
            <span>VAT:</span>
            <span>{payment.currency} {Number(payment.metadata.vat).toFixed(2)}</span>
          </div>
        )}
        
        {settings.include_service_charge && payment.metadata?.service_charge && (
          <div className="flex justify-between text-xs">
            <span>Service Charge:</span>
            <span>{payment.currency} {Number(payment.metadata.service_charge).toFixed(2)}</span>
          </div>
        )}
        
        {settings.show_provider_fee && payment.metadata?.provider_fee && (
          <div className="flex justify-between text-xs">
            <span>Provider Fee:</span>
            <span>{payment.currency} {Number(payment.metadata.provider_fee).toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Status */}
      <div className="flex justify-between py-2 border-t-2 border-black">
        <span>Status:</span>
        <span className="uppercase font-bold">{payment.status}</span>
      </div>

      {/* Footer */}
      {settings.footer_text && (
        <div className="mt-6 pt-3 border-t-2 border-dashed border-black text-center">
          {settings.footer_text}
        </div>
      )}

      {/* QR Code Placeholder */}
      {settings.show_qr_code && (
        <div className="mt-4 flex justify-center">
          <div className="w-24 h-24 border-2 border-black flex items-center justify-center text-xs">
            QR Code
          </div>
        </div>
      )}
    </div>
  );
}
