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
    // Defensive type checking
    if (typeof folioId !== 'string') {
      console.error('[FoliosTab] Invalid folio ID type:', typeof folioId, folioId);
      return;
    }
    
    console.log('[FoliosTab] Opening settlement for folio:', folioId);
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-amber-500 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <div className="p-2 bg-amber-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-amber-600" />
              </div>
              Total Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">
              {formatCurrency(totalOutstanding, 'NGN')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Across all open folios</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              Open Folios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{folioCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently unsettled</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              Average Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {formatCurrency(folioCount > 0 ? totalOutstanding / folioCount : 0, 'NGN')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Per folio</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card className="shadow-lg">
        <CardHeader className="border-b bg-gradient-to-r from-background to-muted/20">
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Receipt className="h-6 w-6 text-primary" />
            </div>
            Outstanding Folios
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by guest name, room, or booking reference..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 text-base shadow-sm"
              />
            </div>
          </div>

          {/* Folios List */}
          {filteredFolios && filteredFolios.length > 0 ? (
            <div className="space-y-4">
              {filteredFolios.map((folio) => (
                <Card key={folio.id} className="hover:shadow-xl transition-all border-l-4 border-l-amber-400 hover:border-l-amber-500">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-6">
                      <div className="space-y-4 flex-1">
                        {/* Guest & Room Info */}
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <Users className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-bold text-lg">{folio.guest?.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {folio.booking?.booking_reference}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" className="font-mono text-base px-3 py-1">
                            Room {folio.room?.number || 'N/A'}
                          </Badge>
                        </div>

                        {/* Financial Summary */}
                        <div className="grid grid-cols-3 gap-6 p-4 bg-muted/30 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-100 rounded-lg">
                              <DollarSign className="h-4 w-4 text-red-600" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Total Charges</p>
                              <p className="font-bold text-sm">
                                {formatCurrency(folio.total_charges, 'NGN')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                              <DollarSign className="h-4 w-4 text-green-600" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Payments</p>
                              <p className="font-bold text-sm text-green-600">
                                {formatCurrency(folio.total_payments, 'NGN')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 rounded-lg">
                              <AlertCircle className="h-4 w-4 text-amber-600" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Balance Due</p>
                              <p className="font-bold text-base text-amber-600">
                                {formatCurrency(folio.balance, 'NGN')}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Stay Dates */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>Check-in: {folio.booking?.check_in ? format(new Date(folio.booking.check_in), 'MMM dd, yyyy') : 'N/A'}</span>
                          <span>•</span>
                          <span>Check-out: {folio.booking?.check_out ? format(new Date(folio.booking.check_out), 'MMM dd, yyyy') : 'N/A'}</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button
                          size="lg"
                          onClick={() => handleSettle(folio.id)}
                          className="whitespace-nowrap bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 shadow-lg"
                        >
                          <Receipt className="h-4 w-4 mr-2" />
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
