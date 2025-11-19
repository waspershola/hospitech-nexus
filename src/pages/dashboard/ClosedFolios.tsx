import { useState } from 'react';
import { useClosedFolios } from '@/hooks/useClosedFolios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/lib/finance/tax';
import { format } from 'date-fns';
import { Search, Eye, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

export default function ClosedFolios() {
  const { data: folios, isLoading } = useClosedFolios();
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const filteredFolios = folios?.filter(folio => {
    const searchLower = searchTerm.toLowerCase();
    return (
      folio.guest?.name?.toLowerCase().includes(searchLower) ||
      folio.booking?.booking_reference?.toLowerCase().includes(searchLower) ||
      folio.room?.number?.toLowerCase().includes(searchLower)
    );
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Closed Folios</h1>
          <p className="text-muted-foreground">
            View historical folio records for completed stays
          </p>
        </div>
        <Badge variant="secondary">
          {filteredFolios?.length || 0} Closed Folios
        </Badge>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search Folios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by guest name, booking reference, or room number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Folios Table */}
      <Card>
        <CardHeader>
          <CardTitle>Folio Records</CardTitle>
        </CardHeader>
        <CardContent>
          {!filteredFolios || filteredFolios.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-2">
                {searchTerm ? 'No folios match your search' : 'No closed folios found'}
              </p>
              {searchTerm && (
                <Button variant="link" onClick={() => setSearchTerm('')}>
                  Clear search
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Folio Date</TableHead>
                    <TableHead>Guest</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Booking Ref</TableHead>
                    <TableHead>Check-in</TableHead>
                    <TableHead>Check-out</TableHead>
                    <TableHead className="text-right">Total Charges</TableHead>
                    <TableHead className="text-right">Total Payments</TableHead>
                    <TableHead className="text-right">Final Balance</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFolios.map((folio) => (
                    <TableRow key={folio.id}>
                      <TableCell className="font-medium">
                        {format(new Date(folio.updated_at), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>{folio.guest?.name}</TableCell>
                      <TableCell>{folio.room?.number}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {folio.booking?.booking_reference}
                      </TableCell>
                      <TableCell>
                        {folio.booking?.check_in 
                          ? format(new Date(folio.booking.check_in), 'MMM dd')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {folio.booking?.check_out 
                          ? format(new Date(folio.booking.check_out), 'MMM dd')
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(folio.total_charges || 0, 'NGN')}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {formatCurrency(folio.total_payments || 0, 'NGN')}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={folio.balance > 0 ? 'text-destructive font-semibold' : 'text-green-600'}>
                          {formatCurrency(folio.balance || 0, 'NGN')}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/dashboard/billing/${folio.id}`)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
