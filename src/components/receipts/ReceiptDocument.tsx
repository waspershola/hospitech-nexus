import { format } from 'date-fns';
import { differenceInDays } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';
import type { ReceiptSettings } from '@/hooks/useReceiptSettings';
import type { ReceiptData } from '@/hooks/useReceiptData';

interface ReceiptDocumentProps {
  receiptData: ReceiptData;
  settings: ReceiptSettings;
  receiptType: 'payment' | 'checkout' | 'reservation';
  receiptNumber?: string;
  transactionDate?: Date;
  locationName?: string;
}

export function ReceiptDocument({
  receiptData,
  settings,
  receiptType,
  receiptNumber = 'RCP-DRAFT',
  transactionDate = new Date(),
  locationName,
}: ReceiptDocumentProps) {
  const paperWidth = settings.paper_size === 'A4' ? '210mm' : 
                     settings.paper_size === 'A5' ? '148mm' :
                     settings.paper_size === '58mm' ? '58mm' : '80mm';

  const fontSizeClass = settings.font_size === 'small' ? 'text-xs' :
                        settings.font_size === 'large' ? 'text-base' : 'text-sm';

  const alignmentClass = settings.alignment === 'left' ? 'text-left' :
                         settings.alignment === 'right' ? 'text-right' : 'text-center';

  const currency = receiptData.financials?.currency_symbol || '₦';
  
  // Calculate nights if booking exists
  const nights = receiptData.booking 
    ? differenceInDays(new Date(receiptData.booking.check_out), new Date(receiptData.booking.check_in))
    : 0;

  // Calculate subtotal from charges
  const chargesSubtotal = receiptData.charges.reduce((sum, charge) => sum + Number(charge.amount), 0);
  
  // Calculate VAT and Service Charge
  const vatRate = receiptData.financials?.vat_rate || 7.5;
  const serviceChargeRate = receiptData.financials?.service_charge || 10;
  
  const vatAmount = (chargesSubtotal * vatRate) / 100;
  const serviceChargeAmount = (chargesSubtotal * serviceChargeRate) / 100;
  const grandTotal = chargesSubtotal + vatAmount + serviceChargeAmount;

  // Get total paid
  const totalPaid = receiptData.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);

  // Transaction type display
  const transactionTypeMap = {
    payment: 'Payment Receipt',
    checkout: 'Check-Out Summary',
    reservation: 'Reservation Confirmation',
  };

  return (
    <div 
      className={`font-mono ${fontSizeClass} ${alignmentClass} bg-white text-black p-4`}
      style={{ maxWidth: paperWidth }}
    >
      {/* Header with Logo */}
      {settings.logo_url && (
        <div className="flex justify-center mb-2">
          <img 
            src={settings.logo_url} 
            alt="Logo" 
            className="max-w-[120px] max-h-[60px] object-contain"
          />
        </div>
      )}

      {/* Hotel Name & Branch */}
      <div className="font-bold text-center mb-1">
        {receiptData.hotelMeta?.hotel_name || 'Hotel'}
      </div>
      {locationName && (
        <div className="text-center text-sm mb-1">
          {locationName}
        </div>
      )}
      {receiptData.hotelMeta?.contact_phone && (
        <div className="text-center text-xs mb-2">
          Phone: {receiptData.hotelMeta.contact_phone}
        </div>
      )}

      <div className="border-t-2 border-dashed border-black my-2" />

      {/* Transaction Type Header */}
      <div className="font-bold text-center my-2">
        {transactionTypeMap[receiptType]}
      </div>
      
      {/* Receipt Metadata */}
      <div className="space-y-1 text-xs mb-3">
        <div className="flex justify-between">
          <span>Receipt #:</span>
          <span className="font-bold">{receiptNumber}</span>
        </div>
        <div className="flex justify-between">
          <span>Date:</span>
          <span>{format(transactionDate, 'dd/MM/yyyy HH:mm')}</span>
        </div>
        {receiptData.staff && (
          <div className="flex justify-between">
            <span>Staff:</span>
            <span>{receiptData.staff.full_name || receiptData.staff.email}</span>
          </div>
        )}
      </div>

      <div className="border-t border-dashed border-gray-400 my-2" />

      {/* Guest & Booking Details */}
      <div className="space-y-1 text-xs mb-3">
        {receiptData.guest && (
          <div className="flex justify-between">
            <span>Guest:</span>
            <span className="font-semibold">{receiptData.guest.name}</span>
          </div>
        )}
        {receiptData.organization && (
          <div className="flex justify-between">
            <span>Organization:</span>
            <span className="font-semibold">{receiptData.organization.name}</span>
          </div>
        )}
        {receiptData.room && (
          <div className="flex justify-between">
            <span>Room:</span>
            <span>{receiptData.room.number}</span>
          </div>
        )}
        {receiptData.booking && (
          <>
            <div className="flex justify-between">
              <span>Check-in:</span>
              <span>{format(new Date(receiptData.booking.check_in), 'dd/MM/yyyy')}</span>
            </div>
            <div className="flex justify-between">
              <span>Check-out:</span>
              <span>{format(new Date(receiptData.booking.check_out), 'dd/MM/yyyy')}</span>
            </div>
          </>
        )}
      </div>

      {/* Itemized Charges */}
      {receiptData.charges.length > 0 && (
        <>
          <div className="border-t border-dashed border-gray-400 my-2" />
          <div className="text-xs font-bold mb-1">Items / Charges:</div>
          <div className="border-t border-dashed border-gray-400 mb-2" />
          
          <div className="space-y-1 text-xs">
            {receiptData.charges.map((charge, idx) => (
              <div key={idx} className="flex justify-between">
                <span className="flex-1">{charge.description}</span>
                <span className="ml-2">{currency}{Number(charge.amount).toFixed(2)}</span>
              </div>
            ))}
            
            {/* Room Charge Summary for checkout */}
            {receiptType === 'checkout' && receiptData.booking && nights > 0 && (
              <div className="flex justify-between pt-1 border-t border-dotted">
                <span>Room ({nights} night{nights > 1 ? 's' : ''})</span>
                <span>{currency}{(Number(receiptData.booking.total_amount)).toFixed(2)}</span>
              </div>
            )}
          </div>

          <div className="border-t border-dashed border-gray-400 my-2" />

          {/* Subtotal */}
          <div className="flex justify-between text-xs mb-1">
            <span>Subtotal:</span>
            <span>{currency}{chargesSubtotal.toFixed(2)}</span>
          </div>

          {/* VAT */}
          {settings.show_vat_breakdown && vatRate > 0 && (
            <div className="flex justify-between text-xs mb-1">
              <span>VAT ({vatRate}%):</span>
              <span>{currency}{vatAmount.toFixed(2)}</span>
            </div>
          )}

          {/* Service Charge */}
          {settings.include_service_charge && serviceChargeRate > 0 && (
            <div className="flex justify-between text-xs mb-1">
              <span>Service Charge ({serviceChargeRate}%):</span>
              <span>{currency}{serviceChargeAmount.toFixed(2)}</span>
            </div>
          )}

          <div className="border-t-2 border-black my-2" />

          {/* Grand Total */}
          <div className="flex justify-between text-sm font-bold mb-2">
            <span>**TOTAL:**</span>
            <span>{currency}{grandTotal.toFixed(2)}</span>
          </div>
        </>
      )}

      {/* Payment Information */}
      {receiptData.payments.length > 0 && (
        <>
          <div className="border-t border-dashed border-gray-400 my-2" />
          
          {receiptData.payments.map((payment, idx) => (
            <div key={idx} className="space-y-1 text-xs mb-2">
              <div className="flex justify-between">
                <span>Paid via:</span>
                <span className="font-semibold uppercase">
                  {payment.method_provider || payment.method || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Amount:</span>
                <span className="font-bold">{currency}{Number(payment.amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="uppercase font-semibold">{payment.status}</span>
              </div>
              {payment.transaction_ref && (
                <div className="flex justify-between">
                  <span>Ref:</span>
                  <span className="text-[10px]">{payment.transaction_ref}</span>
                </div>
              )}
              {settings.show_provider_fee && payment.provider_reference && (
                <div className="flex justify-between">
                  <span>Provider Ref:</span>
                  <span className="text-[10px]">{payment.provider_reference}</span>
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {/* Wallet Balance */}
      {receiptData.walletBalance !== null && receiptData.walletBalance !== undefined && (
        <div className="flex justify-between text-xs mb-2">
          <span>Wallet Balance:</span>
          <span className="font-semibold">{currency}{Number(receiptData.walletBalance).toLocaleString()}</span>
        </div>
      )}

      {/* Footer */}
      {settings.footer_text && (
        <>
          <div className="border-t-2 border-dashed border-black my-3" />
          <div className="text-center text-xs">
            {settings.footer_text}
          </div>
        </>
      )}

      {/* Website/Contact */}
      {receiptData.hotelMeta?.contact_email && (
        <div className="text-center text-xs mt-1">
          {receiptData.hotelMeta.contact_email}
        </div>
      )}

      {/* QR Code */}
      {settings.show_qr_code && (
        <div className="mt-3 flex justify-center">
          <QRCodeSVG 
            value={`receipt:${receiptNumber}`} 
            size={80}
            level="M"
          />
        </div>
      )}

      <div className="border-t-2 border-dashed border-black mt-3" />
    </div>
  );
}
