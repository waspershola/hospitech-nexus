import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, Link, Unlink, AlertCircle, CheckCircle } from 'lucide-react';
import { usePOSReconciliationData, usePOSMatching, useManualPOSMatch, useUnmatchPOSRecord } from '@/hooks/usePOSReconciliation';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

interface POSReconciliationViewProps {
  importId: string;
}

export function POSReconciliationView({ importId }: POSReconciliationViewProps) {
  const { data, isLoading } = usePOSReconciliationData(importId);
  const matchingMutation = usePOSMatching();
  const manualMatchMutation = useManualPOSMatch();
  const unmatchMutation = useUnmatchPOSRecord();
  
  const [selectedSettlement, setSelectedSettlement] = useState<string | null>(null);
  const [selectedLedger, setSelectedLedger] = useState<string | null>(null);

  const handleRunMatching = async (autoMatch: boolean) => {
    await matchingMutation.mutateAsync({ importId, autoMatch });
  };

  const handleManualMatch = async () => {
    if (!selectedSettlement || !selectedLedger) return;
    await manualMatchMutation.mutateAsync({
      settlementRecordId: selectedSettlement,
      ledgerEntryId: selectedLedger
    });
    setSelectedSettlement(null);
    setSelectedLedger(null);
  };

  const handleUnmatch = async (settlementRecordId: string) => {
    await unmatchMutation.mutateAsync(settlementRecordId);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const matched = data?.matched || [];
  const unmatched = data?.unmatched || [];
  const total = (data?.settlementRecords?.length || 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Matched</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{matched.length}</div>
            <p className="text-xs text-muted-foreground">
              {total > 0 ? Math.round((matched.length / total) * 100) : 0}% complete
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Unmatched</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{unmatched.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              size="sm"
              className="w-full"
              onClick={() => handleRunMatching(false)}
              disabled={matchingMutation.isPending}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Find Matches
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => handleRunMatching(true)}
              disabled={matchingMutation.isPending}
            >
              Auto-Match Exact
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Manual Matching Selection */}
      {(selectedSettlement || selectedLedger) && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Manual Matching Mode</span>
              <Button
                size="sm"
                onClick={handleManualMatch}
                disabled={!selectedSettlement || !selectedLedger || manualMatchMutation.isPending}
              >
                <Link className="h-3 w-3 mr-1" />
                Link Records
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="text-muted-foreground">
              {selectedSettlement ? '1 settlement record' : 'No settlement record'} selected
              {' • '}
              {selectedLedger ? '1 ledger entry' : 'No ledger entry'} selected
            </p>
          </CardContent>
        </Card>
      )}

      {/* Side-by-Side Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settlement Records Column */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Settlement Records</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
            {data?.settlementRecords?.map((record: any) => (
              <div
                key={record.id}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedSettlement === record.id
                    ? 'border-primary bg-primary/5'
                    : 'hover:bg-muted/50'
                } ${record.ledger_entry_id ? 'opacity-50' : ''}`}
                onClick={() => !record.ledger_entry_id && setSelectedSettlement(record.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="space-y-1">
                    <div className="font-mono text-sm font-medium">
                      ₦{record.amount.toLocaleString()}
                    </div>
                    {record.transaction_date && (
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(record.transaction_date), 'MMM dd, yyyy HH:mm')}
                      </div>
                    )}
                  </div>
                  {record.ledger_entry_id ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {record.match_confidence}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnmatch(record.id);
                        }}
                      >
                        <Unlink className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Unmatched
                    </Badge>
                  )}
                </div>

                <Separator className="my-2" />

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {record.stan && (
                    <div>
                      <span className="text-muted-foreground">STAN:</span>{' '}
                      <span className="font-mono">{record.stan}</span>
                    </div>
                  )}
                  {record.rrn && (
                    <div>
                      <span className="text-muted-foreground">RRN:</span>{' '}
                      <span className="font-mono">{record.rrn}</span>
                    </div>
                  )}
                  {record.terminal_id && (
                    <div>
                      <span className="text-muted-foreground">Terminal:</span>{' '}
                      <span className="font-mono">{record.terminal_id}</span>
                    </div>
                  )}
                  {record.approval_code && (
                    <div>
                      <span className="text-muted-foreground">Approval:</span>{' '}
                      <span className="font-mono">{record.approval_code}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {(!data?.settlementRecords || data.settlementRecords.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                No settlement records found
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ledger Entries Column */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Internal Ledger (POS Transactions)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
            <div className="text-sm text-muted-foreground mb-3">
              Click a ledger entry to match with selected settlement record
            </div>
            
            {/* This would be populated by a separate query for unmatched ledger entries */}
            <div className="text-center py-8 text-muted-foreground">
              Select "Find Matches" to load potential ledger entries
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
