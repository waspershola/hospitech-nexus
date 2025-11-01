import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { ReceiptSettings } from './useReceiptSettings';

interface PrintReceiptParams {
  receiptType: 'payment' | 'checkout' | 'invoice';
  paymentId?: string;
  bookingId?: string;
  settingsId?: string;
  customData?: Record<string, any>;
}

export function usePrintReceipt() {
  const { tenantId, user } = useAuth();
  const queryClient = useQueryClient();

  const printMutation = useMutation({
    mutationFn: async (params: PrintReceiptParams) => {
      if (!tenantId) throw new Error('No tenant ID');

      // Log the print action
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
          receipt_data: params.customData || {},
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
      // Create print window
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Please allow popups to print receipts');
        return;
      }

      // Generate receipt HTML
      const receiptHtml = generateReceiptHTML(params, receiptSettings);
      
      printWindow.document.write(receiptHtml);
      printWindow.document.close();

      // Wait for content to load, then print
      printWindow.onload = () => {
        printWindow.print();
        // Log the print action
        printMutation.mutate(params);
      };

      toast.success('Receipt sent to printer');
    } catch (error) {
      toast.error('Failed to print receipt');
      console.error('Print error:', error);
    }
  };

  return {
    print,
    isPrinting: printMutation.isPending,
  };
}

function generateReceiptHTML(params: PrintReceiptParams, settings?: ReceiptSettings): string {
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

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Receipt - ${params.receiptType}</title>
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
          }
          
          .header {
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px dashed #000;
          }
          
          .logo {
            max-width: 120px;
            max-height: 60px;
            margin: 0 auto 10px;
            display: block;
          }
          
          .header-text {
            font-weight: bold;
            margin: 5px 0;
          }
          
          .section {
            margin: 15px 0;
            padding: 10px 0;
            border-bottom: 1px dashed #ccc;
          }
          
          .line-item {
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
          }
          
          .total {
            font-weight: bold;
            font-size: 1.2em;
            margin-top: 10px;
            padding-top: 10px;
            border-top: 2px solid #000;
          }
          
          .footer {
            margin-top: 20px;
            padding-top: 10px;
            border-top: 2px dashed #000;
            font-size: 0.9em;
          }
          
          .qr-code {
            margin: 15px auto;
            text-align: center;
          }
        </style>
      </head>
      <body>
        ${settings?.logo_url ? `<img src="${settings.logo_url}" alt="Logo" class="logo" />` : ''}
        
        <div class="header">
          ${settings?.header_text ? `<div class="header-text">${settings.header_text}</div>` : ''}
          <div>Receipt Type: ${params.receiptType.toUpperCase()}</div>
          <div>Date: ${new Date().toLocaleString()}</div>
        </div>
        
        <div class="section">
          <div class="line-item">
            <span>Receipt #:</span>
            <span>${params.paymentId?.substring(0, 8) || 'N/A'}</span>
          </div>
        </div>
        
        <div class="footer">
          ${settings?.footer_text || 'Thank you for your business!'}
        </div>
        
        ${settings?.show_qr_code ? `
          <div class="qr-code">
            <div>[QR Code Placeholder]</div>
          </div>
        ` : ''}
      </body>
    </html>
  `;
}
