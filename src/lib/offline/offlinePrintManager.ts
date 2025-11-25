/**
 * OFFLINE-DESKTOP-V1: Offline Print Manager
 * Handles printing for receipts, folios, and QR codes in offline desktop app
 */

import { tenantDBManager } from './tenantDBManager';
import type { CachedFolio, CachedPayment } from './offlineTypes';

export interface PrintReceiptOptions {
  tenantId: string;
  paymentId: string;
  receiptType: 'payment' | 'checkout' | 'folio';
}

export interface PrintFolioOptions {
  tenantId: string;
  folioId: string;
  format?: 'summary' | 'detailed';
  includeQR?: boolean;
}

export interface PrintQRCodeOptions {
  tenantId: string;
  qrCodeId: string;
  template: 'tent' | 'sticker' | 'poster' | 'card';
}

/**
 * Offline Print Manager
 * Handles all printing operations for desktop app, both online and offline
 */
class OfflinePrintManager {
  constructor() {
    // Uses singleton tenantDBManager instance
  }

  /**
   * Print receipt from local data (offline mode)
   */
  async printReceiptOffline(options: PrintReceiptOptions): Promise<void> {
    console.log('[OfflinePrintManager] PRINT-RECEIPT-OFFLINE-V1', options);

    const db = await tenantDBManager.openTenantDB(options.tenantId);
    
    // Fetch payment from local IndexedDB
    const payment = await db.get('payments', options.paymentId) as CachedPayment;
    if (!payment) {
      throw new Error('Payment not found in local database');
    }

    // Fetch related folio if exists
    let folio: CachedFolio | undefined;
    if (payment.stay_folio_id) {
      folio = await db.get('folios', payment.stay_folio_id) as CachedFolio;
    }

    // Generate receipt HTML
    const receiptHtml = this.generateReceiptHtml({
      payment,
      folio,
      receiptType: options.receiptType,
      tenantId: options.tenantId,
    });

    // Send to Electron for printing
    if (window.electronAPI && 'printHtml' in window.electronAPI) {
      await window.electronAPI.printHtml(receiptHtml);
      console.log('[OfflinePrintManager] Receipt sent to printer');
    } else {
      // Fallback: open print dialog in browser
      this.printHtmlInBrowser(receiptHtml);
    }
  }

  /**
   * Print folio from local data (offline mode)
   */
  async printFolioOffline(options: PrintFolioOptions): Promise<void> {
    console.log('[OfflinePrintManager] PRINT-FOLIO-OFFLINE-V1', options);

    const db = await tenantDBManager.openTenantDB(options.tenantId);
    
    // Fetch folio from local IndexedDB
    const folio = await db.get('folios', options.folioId) as CachedFolio;
    if (!folio) {
      throw new Error('Folio not found in local database');
    }

    // Fetch all transactions for this folio
    const allTransactions = await db.getAll('folio_transactions');
    const transactions = allTransactions.filter(
      (t: any) => t.folio_id === options.folioId
    );

    // Generate folio HTML
    const folioHtml = this.generateFolioHtml({
      folio,
      transactions,
      format: options.format || 'detailed',
      includeQR: options.includeQR || false,
      tenantId: options.tenantId,
    });

    // Send to Electron for printing
    if (window.electronAPI && 'printHtml' in window.electronAPI) {
      await window.electronAPI.printHtml(folioHtml);
      console.log('[OfflinePrintManager] Folio sent to printer');
    } else {
      // Fallback: open print dialog in browser
      this.printHtmlInBrowser(folioHtml);
    }
  }

  /**
   * Generate receipt HTML for printing
   */
  private generateReceiptHtml(data: {
    payment: CachedPayment;
    folio?: CachedFolio;
    receiptType: string;
    tenantId: string;
  }): string {
    const { payment, folio, receiptType } = data;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>${receiptType.toUpperCase()} Receipt</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Courier New', monospace; 
              font-size: 12px; 
              line-height: 1.4;
              padding: 20px;
              max-width: 80mm;
              margin: 0 auto;
            }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px dashed #000; padding-bottom: 10px; }
            .header h1 { font-size: 18px; margin-bottom: 5px; }
            .header p { font-size: 11px; }
            .section { margin-bottom: 15px; }
            .section-title { font-weight: bold; margin-bottom: 5px; text-transform: uppercase; }
            .row { display: flex; justify-content: space-between; margin-bottom: 3px; }
            .total { border-top: 2px solid #000; padding-top: 10px; margin-top: 10px; font-weight: bold; font-size: 14px; }
            .footer { text-align: center; margin-top: 20px; border-top: 2px dashed #000; padding-top: 10px; font-size: 10px; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>PAYMENT RECEIPT</h1>
            <p>Receipt Type: ${receiptType.toUpperCase()}</p>
            <p>Date: ${new Date(payment.created_at).toLocaleString()}</p>
            ${payment.transaction_ref ? `<p>Ref: ${payment.transaction_ref}</p>` : ''}
          </div>

          ${folio ? `
          <div class="section">
            <div class="section-title">Folio Information</div>
            <div class="row">
              <span>Folio #:</span>
              <span>${folio.folio_number || folio.id.slice(0, 8)}</span>
            </div>
          </div>
          ` : ''}

          <div class="section">
            <div class="section-title">Payment Details</div>
            <div class="row">
              <span>Method:</span>
              <span>${payment.method?.toUpperCase() || 'N/A'}</span>
            </div>
            ${payment.metadata?.provider_name ? `
            <div class="row">
              <span>Provider:</span>
              <span>${payment.metadata.provider_name}</span>
            </div>
            ` : ''}
            ${payment.metadata?.location_name ? `
            <div class="row">
              <span>Location:</span>
              <span>${payment.metadata.location_name}</span>
            </div>
            ` : ''}
          </div>

          <div class="total">
            <div class="row">
              <span>AMOUNT PAID:</span>
              <span>₦${payment.amount.toLocaleString()}</span>
            </div>
          </div>

          <div class="footer">
            <p>Thank you for your payment</p>
            <p>This is a computer-generated receipt</p>
            ${navigator.onLine === false ? '<p><strong>OFFLINE MODE</strong></p>' : ''}
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate folio HTML for printing
   */
  private generateFolioHtml(data: {
    folio: CachedFolio;
    transactions: any[];
    format: 'summary' | 'detailed';
    includeQR: boolean;
    tenantId: string;
  }): string {
    const { folio, transactions, format } = data;

    // Calculate totals from transactions
    const charges = transactions
      .filter(t => t.transaction_type === 'charge')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    const payments = transactions
      .filter(t => t.transaction_type === 'payment')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    const balance = charges - payments;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Guest Folio</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: Arial, sans-serif; 
              font-size: 11px; 
              line-height: 1.5;
              padding: 30px;
            }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #000; padding-bottom: 15px; }
            .header h1 { font-size: 24px; margin-bottom: 10px; }
            .folio-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .info-section { padding: 15px; background: #f5f5f5; border-radius: 5px; }
            .info-section h3 { margin-bottom: 10px; font-size: 13px; text-transform: uppercase; }
            .info-row { margin-bottom: 5px; }
            .info-row strong { display: inline-block; width: 120px; }
            .transactions { margin-bottom: 30px; }
            .transactions table { width: 100%; border-collapse: collapse; }
            .transactions th { background: #333; color: white; padding: 10px; text-align: left; font-size: 12px; }
            .transactions td { padding: 8px; border-bottom: 1px solid #ddd; }
            .totals { margin-top: 20px; padding: 20px; background: #f9f9f9; border: 2px solid #333; }
            .totals .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
            .totals .total-row { font-size: 16px; font-weight: bold; border-top: 2px solid #333; padding-top: 10px; margin-top: 10px; }
            .footer { text-align: center; margin-top: 40px; border-top: 2px solid #ddd; padding-top: 15px; font-size: 10px; color: #666; }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>GUEST FOLIO</h1>
            <p>Generated: ${new Date().toLocaleString()}</p>
          </div>

          <div class="folio-info">
            <div class="info-section">
              <h3>Folio Details</h3>
              <div class="info-row">
                <strong>Folio Number:</strong>
                ${folio.folio_number || folio.id.slice(0, 8)}
              </div>
              <div class="info-row">
                <strong>Status:</strong>
                ${folio.status.toUpperCase()}
              </div>
              <div class="info-row">
                <strong>Type:</strong>
                ${folio.folio_type}
              </div>
            </div>

            <div class="info-section">
              <h3>Guest Information</h3>
              <div class="info-row">
                <strong>Guest ID:</strong>
                ${folio.guest_id.slice(0, 8)}
              </div>
            </div>
          </div>

          ${format === 'detailed' ? `
          <div class="transactions">
            <h3 style="margin-bottom: 15px; font-size: 14px;">TRANSACTION HISTORY</h3>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Type</th>
                  <th style="text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${transactions.map(t => `
                  <tr>
                    <td>${new Date(t.created_at).toLocaleDateString()}</td>
                    <td>${t.description}</td>
                    <td>${t.transaction_type}</td>
                    <td style="text-align: right;">
                      ${t.transaction_type === 'charge' ? '' : '-'}₦${Math.abs(t.amount).toLocaleString()}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ` : ''}

          <div class="totals">
            <div class="row">
              <span>Total Charges:</span>
              <span>₦${charges.toLocaleString()}</span>
            </div>
            <div class="row">
              <span>Total Payments:</span>
              <span>-₦${payments.toLocaleString()}</span>
            </div>
            <div class="row total-row">
              <span>BALANCE DUE:</span>
              <span style="color: ${balance > 0 ? '#d32f2f' : '#2e7d32'};">
                ₦${balance.toLocaleString()}
              </span>
            </div>
          </div>

          <div class="footer">
            <p>Thank you for staying with us</p>
            <p>This is a computer-generated folio</p>
            ${navigator.onLine === false ? '<p><strong>GENERATED OFFLINE</strong></p>' : ''}
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Convert HTML string to Blob for Electron printing
   */
  private async htmlToBlob(html: string): Promise<Blob> {
    return new Blob([html], { type: 'text/html' });
  }

  /**
   * Fallback: Print HTML in browser (non-Electron)
   */
  private printHtmlInBrowser(html: string): void {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  }
}

// Singleton instance
let offlinePrintManagerInstance: OfflinePrintManager | null = null;

export function getOfflinePrintManager(): OfflinePrintManager {
  if (!offlinePrintManagerInstance) {
    offlinePrintManagerInstance = new OfflinePrintManager();
  }
  return offlinePrintManagerInstance;
}
