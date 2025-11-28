import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { LedgerFilters } from '@/components/ledger/LedgerFilters';
import { LedgerTable } from '@/components/ledger/LedgerTable';
import { LedgerEntryDrawer } from '@/components/ledger/LedgerEntryDrawer';
import { LedgerExportButtons } from '@/components/ledger/LedgerExportButtons';
import { useLedgerEntries } from '@/hooks/useLedgerEntries';
import type { LedgerFilters as LedgerFiltersType } from '@/types/ledger';

export default function FinanceLedger() {
  const [filters, setFilters] = useState<LedgerFiltersType>({
    dateFrom: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
  });
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

  const { data: result, isLoading } = useLedgerEntries(filters);
  const entries = result?.data || [];
  const totalCount = result?.count || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display text-foreground">Accounting Ledger</h1>
          <p className="text-muted-foreground">
            Complete financial transaction history
            {totalCount > 0 && ` • ${totalCount.toLocaleString()} entries`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <LedgerExportButtons entries={entries} onPrint={() => window.print()} />
          <BookOpen className="h-8 w-8 text-primary" />
        </div>
      </div>

      <LedgerFilters filters={filters} onFiltersChange={setFilters} />

      <LedgerTable
        entries={entries}
        isLoading={isLoading}
        onEntryClick={setSelectedEntryId}
      />

      <LedgerEntryDrawer
        entryId={selectedEntryId}
        open={!!selectedEntryId}
        onOpenChange={(open) => !open && setSelectedEntryId(null)}
      />
    </div>
  );
}
