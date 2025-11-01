import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { ReceiptSettings } from './useReceiptSettings';
import type { ReceiptData } from './useReceiptData';

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
          print_method: 'browser',
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

      // Wait for receipt data if not provided (prevents "Loading..." in print)
      let receiptData = params.receiptData;
      if (!receiptData && (params.bookingId || params.paymentId)) {
        toast.loading('Fetching receipt data...', { id: 'receipt-prep' });
        
        // Give a brief moment for data to load from cache/query
        await new Promise(resolve => setTimeout(resolve, 500));
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
    small: '10px',
    normal: '12px',
    large: '14px',
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
          
          body {
            font-family: 'Courier New', monospace;
            font-size: ${fontSizeMap[fontSize]};
            line-height: 1.4;
            text-align: ${alignment};
            max-width: ${paperWidth};
            margin: 0 auto;
            padding: 10px;
            color: #000;
            background: #fff;
          }
          
          .header {
            margin-bottom: 10px;
          }
          
          .logo {
            max-width: 120px;
            max-height: 60px;
            margin: 0 auto 8px;
            display: block;
          }
          
          .hotel-name {
            font-weight: bold;
            font-size: 1.1em;
            margin-bottom: 4px;
          }
          
          .divider {
            border-top: 2px dashed #000;
            margin: 8px 0;
          }
          
          .divider-thin {
            border-top: 1px dashed #666;
            margin: 6px 0;
          }
          
          .divider-solid {
            border-top: 2px solid #000;
            margin: 8px 0;
          }
          
          .transaction-type {
            font-weight: bold;
            text-align: center;
            margin: 8px 0;
          }
          
          .line-item {
            display: flex;
            justify-content: space-between;
            margin: 4px 0;
            font-size: 0.9em;
          }
          
          .line-item span:first-child {
            flex: 1;
          }
          
          .section-title {
            font-weight: bold;
            margin: 8px 0 4px 0;
            font-size: 0.9em;
          }
          
          .total {
            font-weight: bold;
            font-size: 1.1em;
          }
          
          .footer {
            margin-top: 12px;
            font-size: 0.9em;
          }
          
          .qr-code {
            margin: 10px auto;
            text-align: center;
          }
          
          .uppercase {
            text-transform: uppercase;
          }
        </style>
      </head>
      <body>
        ${settings?.logo_url ? `<img src="${settings.logo_url}" alt="Logo" class="logo" />` : ''}
        
        <div class="hotel-name">${receiptData.hotelMeta?.hotel_name || 'Hotel'}</div>
        ${params.locationName ? `<div style="font-size: 0.9em;">${params.locationName}</div>` : ''}
        ${receiptData.hotelMeta?.contact_phone ? `<div style="font-size: 0.8em;">Phone: ${receiptData.hotelMeta.contact_phone}</div>` : ''}
        
        <div class="divider"></div>
        
        <div class="transaction-type">${transactionTypeMap[params.receiptType]}</div>
        
        <div class="line-item">
          <span>Receipt #:</span>
          <span style="font-weight: bold;">${receiptNumber}</span>
        </div>
        <div class="line-item">
          <span>Date:</span>
          <span>${format(new Date(), 'dd/MM/yyyy HH:mm')}</span>
        </div>
        ${receiptData.staff ? `
          <div class="line-item">
            <span>Staff:</span>
            <span>${receiptData.staff.full_name || receiptData.staff.email}</span>
          </div>
        ` : ''}
        
        <div class="divider-thin"></div>
        
        ${receiptData.guest ? `
          <div class="line-item">
            <span>Guest:</span>
            <span style="font-weight: 600;">${receiptData.guest.name}</span>
          </div>
        ` : ''}
        ${receiptData.organization ? `
          <div class="line-item">
            <span>Organization:</span>
            <span style="font-weight: 600;">${receiptData.organization.name}</span>
          </div>
        ` : ''}
        ${receiptData.room ? `
          <div class="line-item">
            <span>Room:</span>
            <span>${receiptData.room.number}</span>
          </div>
        ` : ''}
        ${receiptData.booking ? `
          <div class="line-item">
            <span>Check-in:</span>
            <span>${format(new Date(receiptData.booking.check_in), 'dd/MM/yyyy')}</span>
          </div>
          <div class="line-item">
            <span>Check-out:</span>
            <span>${format(new Date(receiptData.booking.check_out), 'dd/MM/yyyy')}</span>
          </div>
        ` : ''}
        
        ${receiptData.charges.length > 0 ? `
          <div class="divider-thin"></div>
          <div class="section-title">Items / Charges:</div>
          <div class="divider-thin"></div>
          
          ${receiptData.charges.map(charge => `
            <div class="line-item">
              <span>${charge.description}</span>
              <span>${currency}${Number(charge.amount).toFixed(2)}</span>
            </div>
          `).join('')}
          
          <div class="divider-thin"></div>
          
          <div class="line-item">
            <span>Subtotal:</span>
            <span>${currency}${chargesSubtotal.toFixed(2)}</span>
          </div>
          
          ${settings?.show_vat_breakdown && vatRate > 0 ? `
            <div class="line-item">
              <span>VAT (${vatRate}%):</span>
              <span>${currency}${vatAmount.toFixed(2)}</span>
            </div>
          ` : ''}
          
          ${settings?.include_service_charge && serviceChargeRate > 0 ? `
            <div class="line-item">
              <span>Service Charge (${serviceChargeRate}%):</span>
              <span>${currency}${serviceChargeAmount.toFixed(2)}</span>
            </div>
          ` : ''}
          
          <div class="divider-solid"></div>
          
          <div class="line-item total">
            <span>**TOTAL:**</span>
            <span>${currency}${grandTotal.toFixed(2)}</span>
          </div>
        ` : ''}
        
        ${receiptData.payments.length > 0 ? `
          <div class="divider-thin"></div>
          
          ${receiptData.payments.map(payment => `
            <div class="line-item">
              <span>Paid via:</span>
              <span class="uppercase" style="font-weight: 600;">${payment.method_provider || payment.method || 'N/A'}</span>
            </div>
            <div class="line-item">
              <span>Status:</span>
              <span class="uppercase" style="font-weight: 600;">${payment.status}</span>
            </div>
            ${payment.transaction_ref ? `
              <div class="line-item" style="font-size: 0.8em;">
                <span>Ref:</span>
                <span>${payment.transaction_ref}</span>
              </div>
            ` : ''}
          `).join('')}
        ` : ''}
        
        ${receiptData.walletBalance !== null && receiptData.walletBalance !== undefined ? `
          <div class="line-item">
            <span>Wallet Balance:</span>
            <span style="font-weight: 600;">${currency}${Number(receiptData.walletBalance).toLocaleString()}</span>
          </div>
        ` : ''}
        
        ${settings?.footer_text ? `
          <div class="divider"></div>
          <div class="footer">${settings.footer_text}</div>
        ` : ''}
        
        ${receiptData.hotelMeta?.contact_email ? `
          <div style="font-size: 0.8em; margin-top: 4px;">${receiptData.hotelMeta.contact_email}</div>
        ` : ''}
        
        ${settings?.show_qr_code ? `
          <div class="qr-code">
            <svg width="80" height="80">
              <rect width="80" height="80" fill="#fff" stroke="#000" stroke-width="2"/>
              <text x="40" y="45" text-anchor="middle" font-size="10">QR Code</text>
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
