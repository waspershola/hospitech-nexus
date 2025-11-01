import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { ReceiptSettings } from './useReceiptSettings';
import type { ReceiptData } from './useReceiptData';
import { fetchReceiptData } from '@/lib/receiptDataFetcher';

interface PrintReceiptParams {
  receiptType: 'payment' | 'checkout' | 'reservation';
  paymentId?: string;
  bookingId?: string;
  guestId?: string;
  organizationId?: string;
  settingsId?: string;
  locationName?: string;
  receiptData?: ReceiptData;
}

export function usePrintReceipt() {
  const { tenantId, user } = useAuth();
  const queryClient = useQueryClient();

  const printMutation = useMutation({
    mutationFn: async (params: PrintReceiptParams & { receiptNumber?: string }) => {
      if (!tenantId) throw new Error('No tenant ID');

      // Log the print action with receipt number
      const { data, error } = await supabase
        .from('receipt_print_logs')
        .insert({
          tenant_id: tenantId,
          receipt_type: params.receiptType,
          payment_id: params.paymentId,
          booking_id: params.bookingId,
          receipt_settings_id: params.settingsId,
          printed_by: user?.id,
          print_method: 'pdf',
          receipt_data: {
            ...(params.receiptData || {}),
            receipt_number: params.receiptNumber,
          },
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipt-print-logs'] });
    },
    onError: (error: Error) => {
      toast.error(`Print failed: ${error.message}`);
    },
  });

  const print = async (params: PrintReceiptParams, receiptSettings?: ReceiptSettings) => {
    try {
      if (!tenantId) {
        toast.error('No tenant ID');
        return;
      }

      // Show loading toast while preparing receipt
      toast.loading('Preparing receipt...', { id: 'receipt-prep' });

      // Generate receipt number
      const { data: receiptNumber, error: receiptError } = await supabase
        .rpc('generate_receipt_number', {
          p_tenant_id: tenantId,
          p_receipt_type: params.receiptType,
        });

      if (receiptError) {
        console.error('Receipt number generation error:', receiptError);
        toast.error('Failed to generate receipt number', { id: 'receipt-prep' });
        return;
      }

      // Fetch receipt data if not provided
      let receiptData = params.receiptData;
      if (!receiptData && (params.bookingId || params.paymentId)) {
        toast.loading('Fetching receipt data...', { id: 'receipt-prep' });
        
        try {
          receiptData = await fetchReceiptData({
            tenantId,
            bookingId: params.bookingId,
            paymentId: params.paymentId,
            guestId: params.guestId,
            organizationId: params.organizationId,
          });
        } catch (error) {
          console.error('Failed to fetch receipt data:', error);
          toast.error('Failed to load receipt data', { id: 'receipt-prep' });
          return;
        }
      }

      // Create print window
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Please allow popups to print receipts', { id: 'receipt-prep' });
        return;
      }

      // Generate receipt HTML with receipt number
      const receiptHtml = generateReceiptHTML(
        params, 
        receiptSettings, 
        receiptData,
        receiptNumber || 'DRAFT'
      );
      
      printWindow.document.write(receiptHtml);
      printWindow.document.close();

      // Wait for content to load, then print
      printWindow.onload = () => {
        printWindow.print();
        // Log the print action with receipt number
        printMutation.mutate({ ...params, receiptNumber });
      };

      toast.success('Receipt sent to printer', { id: 'receipt-prep' });
    } catch (error) {
      toast.error('Failed to print receipt', { id: 'receipt-prep' });
      console.error('Print error:', error);
    }
  };

  return {
    print,
    isPrinting: printMutation.isPending,
  };
}

function generateReceiptHTML(
  params: PrintReceiptParams, 
  settings?: ReceiptSettings,
  receiptData?: ReceiptData,
  receiptNumber: string = 'DRAFT'
): string {
  if (!receiptData) {
    return generateSimpleReceiptHTML(params, settings);
  }

  const paperSize = settings?.paper_size || '80mm';
  const alignment = settings?.alignment || 'center';
  const fontSize = settings?.font_size || 'normal';

  const paperWidth = paperSize === 'A4' ? '210mm' : 
                     paperSize === 'A5' ? '148mm' :
                     paperSize === '58mm' ? '58mm' : '80mm';

  const fontSizeMap = {
    small: '11px',
    normal: '13px',
    large: '15px',
  };

  const currency = receiptData.financials?.currency_symbol || '₦';
  
  // Calculate charges and totals
  const chargesSubtotal = receiptData.charges.reduce((sum, c) => sum + Number(c.amount), 0);
  const vatRate = receiptData.financials?.vat_rate || 7.5;
  const serviceChargeRate = receiptData.financials?.service_charge || 10;
  const vatAmount = (chargesSubtotal * vatRate) / 100;
  const serviceChargeAmount = (chargesSubtotal * serviceChargeRate) / 100;
  const grandTotal = chargesSubtotal + vatAmount + serviceChargeAmount;
  const totalPaid = receiptData.payments.reduce((sum, p) => sum + Number(p.amount), 0);

  const transactionTypeMap = {
    payment: 'Payment Receipt',
    checkout: 'Check-Out Summary',
    reservation: 'Reservation Confirmation',
  };

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${transactionTypeMap[params.receiptType]} - ${receiptNumber}</title>
        <style>
          @media print {
            @page {
              size: ${paperWidth} auto;
              margin: 5mm;
            }
            body {
              margin: 0;
            }
          }
          
          * {
            box-sizing: border-box;
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            font-size: ${fontSizeMap[fontSize]};
            line-height: 1.6;
            text-align: ${alignment};
            max-width: ${paperWidth};
            margin: 0 auto;
            padding: 16px;
            color: #000;
            background: #fff;
          }
          
          .logo {
            max-width: 100px;
            max-height: 50px;
            margin: 0 auto 12px;
            display: block;
          }
          
          .hotel-name {
            font-weight: bold;
            font-size: 1.3em;
            margin-bottom: 4px;
            text-transform: uppercase;
          }
          
          .location-name {
            font-size: 0.85em;
            margin-bottom: 2px;
          }
          
          .contact-info {
            font-size: 0.75em;
            margin-bottom: 2px;
          }
          
          .header-text {
            font-size: 0.85em;
            margin-top: 8px;
            font-weight: 500;
          }
          
          .divider {
            border-top: 1px solid #ddd;
            margin: 12px 0;
          }
          
          .divider-thick {
            border-top: 2px solid #000;
            margin: 12px 0;
          }
          
          .receipt-type {
            font-weight: 600;
            text-align: center;
            margin: 12px 0;
            font-size: 1.1em;
          }
          
          .line-item {
            display: flex;
            justify-content: space-between;
            margin: 6px 0;
            font-size: 0.95em;
          }
          
          .line-item-label {
            flex: 0 0 auto;
            margin-right: 16px;
          }
          
          .line-item-value {
            text-align: right;
            font-weight: 500;
          }
          
          .charge-item {
            display: flex;
            justify-content: space-between;
            margin: 4px 0;
          }
          
          .charge-desc {
            flex: 1;
            margin-right: 8px;
          }
          
          .charge-amount {
            text-align: right;
            white-space: nowrap;
          }
          
          .total-row {
            font-weight: bold;
            font-size: 1.15em;
            margin-top: 8px;
          }
          
          .payment-info {
            margin: 8px 0;
            padding: 8px 0;
          }
          
          .footer-text {
            margin-top: 12px;
            font-size: 0.85em;
            font-weight: 500;
          }
          
          .qr-container {
            margin: 12px auto;
            text-align: center;
          }
          
          .text-semibold {
            font-weight: 600;
          }
          
          .text-bold {
            font-weight: bold;
          }
          
          .uppercase {
            text-transform: uppercase;
          }
        </style>
      </head>
      <body>
        ${settings?.logo_url ? `<img src="${settings.logo_url}" alt="Logo" class="logo" />` : ''}
        
        <div class="hotel-name">${receiptData.hotelMeta?.hotel_name || 'Hotel'}</div>
        ${params.locationName ? `<div class="location-name">${params.locationName}</div>` : ''}
        ${receiptData.hotelMeta?.contact_phone ? `<div class="contact-info">${receiptData.hotelMeta.contact_phone}</div>` : ''}
        ${settings?.header_text ? `<div class="header-text">${settings.header_text}</div>` : ''}
        
        <div class="divider"></div>
        
        <div class="receipt-type">${transactionTypeMap[params.receiptType]}</div>
        
        <div class="line-item">
          <span class="line-item-label">Receipt #:</span>
          <span class="line-item-value text-bold">${receiptNumber}</span>
        </div>
        <div class="line-item">
          <span class="line-item-label">Date:</span>
          <span class="line-item-value">${format(new Date(), 'dd/MM/yyyy HH:mm')}</span>
        </div>
        ${receiptData.staff ? `
          <div class="line-item">
            <span class="line-item-label">Staff:</span>
            <span class="line-item-value">${receiptData.staff.full_name || receiptData.staff.email}</span>
          </div>
        ` : ''}
        
        <div class="divider"></div>
        
        ${receiptData.guest ? `
          <div class="line-item">
            <span class="line-item-label">Guest:</span>
            <span class="line-item-value text-semibold">${receiptData.guest.name}</span>
          </div>
        ` : ''}
        ${receiptData.organization ? `
          <div class="line-item">
            <span class="line-item-label">Organization:</span>
            <span class="line-item-value text-semibold">${receiptData.organization.name}</span>
          </div>
        ` : ''}
        ${receiptData.room ? `
          <div class="line-item">
            <span class="line-item-label">Room:</span>
            <span class="line-item-value text-semibold">${receiptData.room.number}</span>
          </div>
        ` : ''}
        ${receiptData.booking ? `
          <div class="line-item">
            <span class="line-item-label">Check-in:</span>
            <span class="line-item-value">${format(new Date(receiptData.booking.check_in), 'dd/MM/yyyy')}</span>
          </div>
          <div class="line-item">
            <span class="line-item-label">Check-out:</span>
            <span class="line-item-value">${format(new Date(receiptData.booking.check_out), 'dd/MM/yyyy')}</span>
          </div>
        ` : ''}
        
        ${receiptData.charges.length > 0 ? `
          <div class="divider"></div>
          
          ${receiptData.charges.map(charge => `
            <div class="charge-item">
              <span class="charge-desc">${charge.description}</span>
              <span class="charge-amount">${currency}${Number(charge.amount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
          `).join('')}
          
          <div class="divider"></div>
          
          <div class="line-item">
            <span class="line-item-label">Subtotal:</span>
            <span class="line-item-value">${currency}${chargesSubtotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
          </div>
          
          ${settings?.show_vat_breakdown && vatRate > 0 ? `
            <div class="line-item" style="font-size: 0.9em;">
              <span class="line-item-label">VAT (${vatRate}%):</span>
              <span class="line-item-value">${currency}${vatAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
          ` : ''}
          
          ${settings?.include_service_charge && serviceChargeRate > 0 ? `
            <div class="line-item" style="font-size: 0.9em;">
              <span class="line-item-label">Service Charge (${serviceChargeRate}%):</span>
              <span class="line-item-value">${currency}${serviceChargeAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
          ` : ''}
          
          <div class="divider-thick"></div>
          
          <div class="line-item total-row">
            <span class="line-item-label">TOTAL:</span>
            <span class="line-item-value">${currency}${grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
          </div>
        ` : ''}
        
        ${receiptData.payments.length > 0 ? `
          <div class="divider"></div>
          
          ${receiptData.payments.map(payment => `
            <div class="payment-info">
              <div class="line-item">
                <span class="line-item-label">Amount Paid:</span>
                <span class="line-item-value text-bold">${currency}${Number(payment.amount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
              </div>
              <div class="line-item">
                <span class="line-item-label">Paid via:</span>
                <span class="line-item-value text-semibold uppercase">${payment.method_provider || payment.method || 'N/A'}</span>
              </div>
              <div class="line-item">
                <span class="line-item-label">Status:</span>
                <span class="line-item-value text-semibold">${payment.status}</span>
              </div>
              ${payment.transaction_ref ? `
                <div class="line-item" style="font-size: 0.85em;">
                  <span class="line-item-label">Ref:</span>
                  <span class="line-item-value">${payment.transaction_ref}</span>
                </div>
              ` : ''}
              ${payment.provider_reference ? `
                <div class="line-item" style="font-size: 0.85em;">
                  <span class="line-item-label">Provider Ref:</span>
                  <span class="line-item-value">${payment.provider_reference}</span>
                </div>
              ` : ''}
              <div class="line-item" style="font-size: 0.85em;">
                <span class="line-item-label">Date:</span>
                <span class="line-item-value">${format(new Date(payment.created_at), 'dd/MM/yyyy HH:mm')}</span>
              </div>
            </div>
          `).join('')}
          
          <div class="divider"></div>
          
          <div class="line-item total-row">
            <span class="line-item-label">TOTAL PAID:</span>
            <span class="line-item-value">${currency}${totalPaid.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
          </div>
          
          ${totalPaid < grandTotal ? `
            <div class="line-item" style="color: #dc2626;">
              <span class="line-item-label">Balance Due:</span>
              <span class="line-item-value text-bold">${currency}${(grandTotal - totalPaid).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
          ` : totalPaid > grandTotal ? `
            <div class="line-item" style="color: #16a34a;">
              <span class="line-item-label">Overpayment:</span>
              <span class="line-item-value text-bold">${currency}${(totalPaid - grandTotal).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
          ` : ''}
        ` : ''}
        
        ${receiptData.walletBalance !== null && receiptData.walletBalance !== undefined ? `
          <div class="line-item">
            <span class="line-item-label">Wallet Balance:</span>
            <span class="line-item-value text-semibold">${currency}${Number(receiptData.walletBalance).toLocaleString()}</span>
          </div>
        ` : ''}
        
        ${settings?.footer_text ? `
          <div class="divider"></div>
          <div class="footer-text">${settings.footer_text}</div>
        ` : ''}
        
        ${receiptData.hotelMeta?.contact_email ? `
          <div class="contact-info" style="margin-top: 8px;">${receiptData.hotelMeta.contact_email}</div>
        ` : ''}
        
        ${settings?.show_qr_code ? `
          <div class="qr-container">
            <svg width="80" height="80" style="border: 2px solid #000;">
              <rect width="80" height="80" fill="#fff"/>
              <text x="40" y="45" text-anchor="middle" font-size="10" fill="#000">QR Code</text>
            </svg>
          </div>
        ` : ''}
        
        <div class="divider"></div>
      </body>
    </html>
  `;
}

function generateSimpleReceiptHTML(params: PrintReceiptParams, settings?: ReceiptSettings): string {
  const paperSize = settings?.paper_size || '80mm';
  const paperWidth = paperSize === 'A4' ? '210mm' : 
                     paperSize === 'A5' ? '148mm' :
                     paperSize === '58mm' ? '58mm' : '80mm';
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Receipt - ${params.receiptType}</title>
        <style>
          @media print {
            @page { size: ${paperWidth} auto; margin: 5mm; }
            body { margin: 0; }
          }
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            max-width: ${paperWidth};
            margin: 0 auto;
            padding: 10px;
          }
        </style>
      </head>
      <body>
        <div style="text-align: center; margin-bottom: 10px;">
          <strong>${params.receiptType.toUpperCase()} RECEIPT</strong>
        </div>
        <div>Date: ${format(new Date(), 'dd/MM/yyyy HH:mm')}</div>
        <div>Loading receipt data...</div>
      </body>
    </html>
  `;
}
