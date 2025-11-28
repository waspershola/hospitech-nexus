import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { LedgerFilters } from '@/components/ledger/LedgerFilters';
import { LedgerTable } from '@/components/ledger/LedgerTable';
import { LedgerEntryDrawer } from '@/components/ledger/LedgerEntryDrawer';
import { useLedgerEntries } from '@/hooks/useLedgerEntries';
import type { LedgerFilters as LedgerFiltersType } from '@/types/ledger';

export default function FinanceLedger() {
  const [filters, setFilters] = useState<LedgerFiltersType>({
    dateFrom: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
  });
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

  const { data: entries, isLoading } = useLedgerEntries(filters);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display text-foreground">Accounting Ledger</h1>
          <p className="text-muted-foreground">Complete financial transaction history</p>
        </div>
        <BookOpen className="h-8 w-8 text-primary" />
      </div>

      <LedgerFilters filters={filters} onFiltersChange={setFilters} />

      <LedgerTable
        entries={entries || []}
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
