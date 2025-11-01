import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface PrintWalletStatementParams {
  walletId: string;
  startDate?: Date;
  endDate?: Date;
}

export function useWalletStatementPrint() {
  const { tenantId } = useAuth();

  const printStatement = async (params: PrintWalletStatementParams) => {
    try {
      // Fetch wallet details
      const { data: wallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('id', params.walletId)
        .eq('tenant_id', tenantId)
        .single();

      if (!wallet) {
        toast.error('Wallet not found');
        return;
      }

      // Fetch transactions with filters
      let query = supabase
        .from('wallet_transactions')
        .select('*')
        .eq('wallet_id', params.walletId)
        .order('created_at', { ascending: true });

      if (params.startDate) {
        query = query.gte('created_at', params.startDate.toISOString());
      }
      if (params.endDate) {
        query = query.lte('created_at', params.endDate.toISOString());
      }

      const { data: transactions } = await query;

      // Fetch hotel branding
      const { data: branding } = await supabase
        .from('hotel_branding')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      const { data: meta } = await supabase
        .from('hotel_meta')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      // Calculate balances
      let runningBalance = 0;
      const txnsWithBalance = (transactions || []).map(txn => {
        if (txn.type === 'credit') {
          runningBalance += txn.amount;
        } else {
          runningBalance -= txn.amount;
        }
        return { ...txn, balance_after: runningBalance };
      });

      const totalCredits = transactions?.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0) || 0;
      const totalDebits = transactions?.filter(t => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0) || 0;

      // Generate HTML
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Wallet Statement - ${wallet.name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .header h1 { margin: 0; font-size: 24px; }
            .header p { margin: 5px 0; color: #666; }
            .wallet-info { background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 8px; }
            .wallet-info h3 { margin: 0 0 10px 0; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background: #333; color: white; font-weight: bold; }
            .credit { color: green; }
            .debit { color: red; }
            .summary { margin-top: 30px; padding: 15px; background: #f5f5f5; border-radius: 8px; }
            .summary-row { display: flex; justify-content: space-between; margin: 5px 0; }
            .summary-row.total { font-weight: bold; font-size: 18px; margin-top: 10px; padding-top: 10px; border-top: 2px solid #333; }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${meta?.hotel_name || 'Hotel'}</h1>
            <p>${meta?.tagline || ''}</p>
            <p>Wallet Statement</p>
          </div>

          <div class="wallet-info">
            <h3>Wallet Details</h3>
            <p><strong>Wallet Name:</strong> ${wallet.name || wallet.department || 'Wallet'}</p>
            <p><strong>Type:</strong> ${wallet.wallet_type}</p>
            <p><strong>Currency:</strong> ${wallet.currency}</p>
            <p><strong>Period:</strong> ${params.startDate ? new Date(params.startDate).toLocaleDateString() : 'All'} - ${params.endDate ? new Date(params.endDate).toLocaleDateString() : 'Present'}</p>
            <p><strong>Current Balance:</strong> ${wallet.currency} ${wallet.balance.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
          </div>

          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Reference</th>
                <th>Description</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Balance</th>
                <th>Performed By</th>
              </tr>
            </thead>
            <tbody>
              ${txnsWithBalance.map(txn => `
                <tr>
                  <td>${new Date(txn.created_at).toLocaleDateString()} ${new Date(txn.created_at).toLocaleTimeString()}</td>
                  <td>${txn.id.slice(0, 8)}</td>
                  <td>${txn.description || '-'}</td>
                  <td class="${txn.type}">${txn.type.toUpperCase()}</td>
                  <td class="${txn.type}">${txn.type === 'debit' ? '-' : '+'}${wallet.currency} ${txn.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                  <td>${wallet.currency} ${txn.balance_after.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                  <td>System</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="summary">
            <h3>Summary</h3>
            <div class="summary-row">
              <span>Total Credits:</span>
              <span class="credit">+${wallet.currency} ${totalCredits.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
            <div class="summary-row">
              <span>Total Debits:</span>
              <span class="debit">-${wallet.currency} ${totalDebits.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
            <div class="summary-row total">
              <span>Net Change:</span>
              <span>${wallet.currency} ${(totalCredits - totalDebits).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
            <div class="summary-row total">
              <span>Current Balance:</span>
              <span>${wallet.currency} ${wallet.balance.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
          </div>

          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 100);
            };
          </script>
        </body>
        </html>
      `;

      // Open print window
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
      }
    } catch (error) {
      console.error('Error printing wallet statement:', error);
      toast.error('Failed to generate wallet statement');
    }
  };

  const exportToCSV = async (params: PrintWalletStatementParams) => {
    try {
      let query = supabase
        .from('wallet_transactions')
        .select('*')
        .eq('wallet_id', params.walletId)
        .order('created_at', { ascending: true });

      if (params.startDate) {
        query = query.gte('created_at', params.startDate.toISOString());
      }
      if (params.endDate) {
        query = query.lte('created_at', params.endDate.toISOString());
      }

      const { data: transactions } = await query;

      const csvContent = [
        ['Date', 'Time', 'Reference', 'Type', 'Description', 'Amount', 'Performed By'],
        ...(transactions || []).map(txn => [
          new Date(txn.created_at).toLocaleDateString(),
          new Date(txn.created_at).toLocaleTimeString(),
          txn.id.slice(0, 8),
          txn.type,
          txn.description || '-',
          txn.amount,
          'System'
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wallet-statement-${params.walletId}-${Date.now()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success('Statement exported successfully');
    } catch (error) {
      console.error('Error exporting statement:', error);
      toast.error('Failed to export statement');
    }
  };

  return { printStatement, exportToCSV };
}
