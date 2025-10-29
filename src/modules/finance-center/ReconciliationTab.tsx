import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Search,
  Link2,
  Unlink,
  Upload,
  RefreshCw,
  Zap
} from 'lucide-react';
import { useReconciliation } from '@/hooks/useReconciliation';
import { usePayments } from '@/hooks/usePayments';
import { useFinanceProviders } from '@/hooks/useFinanceProviders';
import { useAutoSyncReconciliation } from '@/hooks/useAutoSyncReconciliation';
import { CSVImportDialog } from './CSVImportDialog';
import { ReconciliationSummary } from './components/ReconciliationSummary';
import { format, subDays } from 'date-fns';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function ReconciliationTab() {
  const { records, isLoading, matchTransaction, unmatchTransaction, autoMatch, isAutoMatching } = useReconciliation();
  const { payments } = usePayments();
  const { providers } = useFinanceProviders();
  const { autoSync, isSyncing } = useAutoSyncReconciliation();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRecord, setSelectedRecord] = useState<string | null>(null);
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');

  const filteredRecords = records.filter((record) => {
    const matchesSearch = record.reference.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'matched':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'unmatched':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'partial':
      case 'overpaid':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'matched':
        return 'default';
      case 'unmatched':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const handleMatch = (recordId: string, paymentId: string) => {
    matchTransaction({ recordId, paymentId });
    setSelectedRecord(null);
  };

  const handleAutoSync = (providerId: string) => {
    const startDate = subDays(new Date(), 30).toISOString();
    const endDate = new Date().toISOString();
    
    autoSync({
      provider_id: providerId,
      start_date: startDate,
      end_date: endDate,
    });
  };

  const activeProviders = providers.filter(p => p.status === 'active');

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading reconciliation records...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-display font-semibold">Reconciliation</h2>
          <p className="text-muted-foreground">Match external transactions with internal payments</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => autoMatch()}
            disabled={isAutoMatching || records.filter(r => r.status === 'unmatched').length === 0}
          >
            <Zap className={`w-4 h-4 mr-2 ${isAutoMatching ? 'animate-spin' : ''}`} />
            {isAutoMatching ? 'Auto-Matching...' : 'Smart Auto-Match'}
          </Button>
          {activeProviders.length > 0 && (
            <Select
              value={selectedProviderId}
              onValueChange={(value) => {
                setSelectedProviderId(value);
                handleAutoSync(value);
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Auto-sync provider" />
              </SelectTrigger>
              <SelectContent>
                {activeProviders.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      {provider.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            variant="outline"
            onClick={() => {
              if (selectedProviderId) {
                handleAutoSync(selectedProviderId);
              } else if (activeProviders.length > 0) {
                setSelectedProviderId(activeProviders[0].id);
                handleAutoSync(activeProviders[0].id);
              } else {
                toast.error('Please add an active provider first');
              }
            }}
            disabled={isSyncing || activeProviders.length === 0}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Transactions'}
          </Button>
          <Button onClick={() => {
            if (providers.length > 0) {
              setSelectedProviderId(providers[0].id);
              setCsvImportOpen(true);
            } else {
              toast.error('Please add a provider first');
            }
          }}>
            <Upload className="w-4 h-4 mr-2" />
            Import CSV
          </Button>
        </div>
      </div>

      {/* Reconciliation Summary */}
      {records.length > 0 && (
        <ReconciliationSummary records={records} />
      )}

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by reference..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="matched">Matched</SelectItem>
            <SelectItem value="unmatched">Unmatched</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="overpaid">Overpaid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 rounded-2xl shadow-card">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <CheckCircle2 className="w-4 h-4 text-semantic-success" />
            Matched
          </div>
          <div className="text-2xl font-bold">
            {records.filter(r => r.status === 'matched').length}
          </div>
        </Card>
        <Card className="p-4 rounded-2xl shadow-card">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <XCircle className="w-4 h-4 text-semantic-error" />
            Unmatched
          </div>
          <div className="text-2xl font-bold">
            {records.filter(r => r.status === 'unmatched').length}
          </div>
        </Card>
        <Card className="p-4 rounded-2xl shadow-card">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <AlertCircle className="w-4 h-4 text-semantic-warning" />
            Requires Attention
          </div>
          <div className="text-2xl font-bold">
            {records.filter(r => r.status === 'partial' || r.status === 'overpaid').length}
          </div>
        </Card>
        <Card className="p-4 rounded-2xl shadow-card">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Zap className="w-4 h-4 text-primary" />
            Auto-Reconcile Ready
          </div>
          <div className="text-2xl font-bold">
            {activeProviders.length}
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        {filteredRecords.length > 0 ? (
          filteredRecords.map((record) => (
          <Card key={record.id} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  {getStatusIcon(record.status)}
                  <div>
                    <div className="font-semibold">{record.reference}</div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(record.created_at), 'MMM dd, yyyy HH:mm')}
                    </div>
                  </div>
                  <Badge variant={getStatusVariant(record.status)}>
                    {record.status}
                  </Badge>
                  <Badge variant="outline">{record.source}</Badge>
                </div>

                <div className="flex items-center gap-6 text-sm mt-4">
                  <div>
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="ml-2 font-semibold">₦{record.amount.toLocaleString()}</span>
                  </div>
                  {record.reconciled_at && (
                    <div>
                      <span className="text-muted-foreground">Reconciled:</span>
                      <span className="ml-2">{format(new Date(record.reconciled_at), 'MMM dd, yyyy')}</span>
                    </div>
                  )}
                </div>

                {selectedRecord === record.id && record.status === 'unmatched' && (
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <div className="text-sm font-medium mb-2">Match with payment:</div>
                    <Select onValueChange={(paymentId) => handleMatch(record.id, paymentId)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a payment..." />
                      </SelectTrigger>
                      <SelectContent>
                        {payments
                          .filter(p => Math.abs(Number(p.amount) - record.amount) < 0.01)
                          .map((payment) => (
                            <SelectItem key={payment.id} value={payment.id}>
                              {payment.provider_reference || payment.id.slice(0, 8)} - ₦{Number(payment.amount).toLocaleString()}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {record.status === 'unmatched' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedRecord(selectedRecord === record.id ? null : record.id)}
                  >
                    <Link2 className="w-4 h-4 mr-2" />
                    Match
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => unmatchTransaction(record.id)}
                  >
                    <Unlink className="w-4 h-4 mr-2" />
                    Unmatch
                  </Button>
                )}
              </div>
            </div>
          </Card>
          ))
        ) : (
          <Card className="p-12 text-center rounded-2xl">
            <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Records Found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Click Auto-Sync or Import CSV to start reconciliation'}
            </p>
            {activeProviders.length > 0 && (
              <Button onClick={() => handleAutoSync(activeProviders[0].id)} disabled={isSyncing}>
                <Zap className="w-4 h-4 mr-2" />
                {isSyncing ? 'Syncing...' : 'Start Auto-Sync'}
              </Button>
            )}
          </Card>
        )}
      </div>

      <CSVImportDialog
        open={csvImportOpen}
        onClose={() => setCsvImportOpen(false)}
        providerId={selectedProviderId}
      />
    </div>
  );
}
