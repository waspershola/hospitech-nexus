import { useState } from 'react';
import { useOutstandingFolios } from '@/hooks/useOutstandingFolios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Receipt, 
  Search, 
  AlertCircle, 
  DollarSign,
  Users,
  Calendar
} from 'lucide-react';
import { formatCurrency } from '@/lib/finance/tax';
import { format } from 'date-fns';
import { FolioSettlementDialog } from './components/FolioSettlementDialog';

export function FoliosTab() {
  const { data: folios, isLoading } = useOutstandingFolios();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFolioId, setSelectedFolioId] = useState<string | null>(null);
  const [settlementOpen, setSettlementOpen] = useState(false);

  const filteredFolios = folios?.filter(folio => {
    const search = searchTerm.toLowerCase();
    return (
      folio.guest?.name?.toLowerCase().includes(search) ||
      folio.room?.number?.toLowerCase().includes(search) ||
      folio.booking?.booking_reference?.toLowerCase().includes(search)
    );
  });

  const totalOutstanding = folios?.reduce((sum, f) => sum + f.balance, 0) || 0;
  const folioCount = folios?.length || 0;

  const handleSettle = (folioId: string) => {
    setSelectedFolioId(folioId);
    setSettlementOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {formatCurrency(totalOutstanding, 'NGN')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Open Folios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{folioCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Average Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(folioCount > 0 ? totalOutstanding / folioCount : 0, 'NGN')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Outstanding Folios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by guest name, room, or booking reference..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Folios List */}
          {filteredFolios && filteredFolios.length > 0 ? (
            <div className="space-y-4">
              {filteredFolios.map((folio) => (
                <Card key={folio.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="font-mono">
                            {folio.room?.number || 'N/A'}
                          </Badge>
                          <div>
                            <p className="font-semibold">{folio.guest?.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {folio.booking?.booking_reference}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Total Charges</p>
                            <p className="font-medium">
                              {formatCurrency(folio.total_charges, 'NGN')}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Payments</p>
                            <p className="font-medium text-green-600">
                              {formatCurrency(folio.total_payments, 'NGN')}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Balance Due</p>
                            <p className="font-semibold text-amber-600">
                              {formatCurrency(folio.balance, 'NGN')}
                            </p>
                          </div>
                        </div>

                        <div className="text-xs text-muted-foreground">
                          Check-in: {folio.booking?.check_in ? format(new Date(folio.booking.check_in), 'MMM dd, yyyy') : 'N/A'}
                          {' • '}
                          Check-out: {folio.booking?.check_out ? format(new Date(folio.booking.check_out), 'MMM dd, yyyy') : 'N/A'}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSettle(folio.id)}
                          className="whitespace-nowrap"
                        >
                          Settle Balance
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? 'No folios match your search' : 'No outstanding folios'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settlement Dialog */}
      <FolioSettlementDialog
        folioId={selectedFolioId}
        open={settlementOpen}
        onClose={() => {
          setSettlementOpen(false);
          setSelectedFolioId(null);
        }}
      />
    </div>
  );
}
