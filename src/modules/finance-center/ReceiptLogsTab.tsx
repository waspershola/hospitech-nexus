import { useState } from 'react';
import { useReceiptPrintLogs } from '@/hooks/useReceiptPrintLogs';
import { usePrintReceipt } from '@/hooks/usePrintReceipt';
import { useReceiptSettings } from '@/hooks/useReceiptSettings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Printer, Filter, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export function ReceiptLogsTab() {
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    receiptType: '',
    userId: '',
  });

  const { logs, isLoading, reprint } = useReceiptPrintLogs(filters);
  const { print } = usePrintReceipt();
  const { settings: receiptSettings } = useReceiptSettings();

  const handleReprint = (log: any) => {
    const defaultSettings = receiptSettings?.[0];
    if (!defaultSettings) {
      toast.error('No receipt settings found');
      return;
    }

    print({
      receiptType: log.receipt_type as any,
      bookingId: log.booking_id,
      paymentId: log.payment_id,
      settingsId: defaultSettings.id,
    }, defaultSettings);
  };

  const getReceiptTypeBadge = (type: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      checkout: 'default',
      payment: 'secondary',
      booking: 'outline',
    };

    return (
      <Badge variant={variants[type] || 'outline'}>
        {type}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-semibold mb-2">Receipt Print Logs</h2>
        <p className="text-muted-foreground">
          View and manage receipt printing history
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="receiptType">Receipt Type</Label>
              <Select
                value={filters.receiptType}
                onValueChange={(value) => setFilters({ ...filters, receiptType: value })}
              >
                <SelectTrigger id="receiptType">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All types</SelectItem>
                  <SelectItem value="checkout">Checkout</SelectItem>
                  <SelectItem value="payment">Payment</SelectItem>
                  <SelectItem value="booking">Booking</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 flex items-end">
              <Button
                variant="outline"
                onClick={() => setFilters({ startDate: '', endDate: '', receiptType: '', userId: '' })}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Print History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No print logs found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt #</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Printed By</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono">{log.receipt_data?.receiptNumber || 'N/A'}</TableCell>
                    <TableCell>{getReceiptTypeBadge(log.receipt_type)}</TableCell>
                    <TableCell>
                      {format(new Date(log.printed_at), 'MMM dd, yyyy HH:mm')}
                    </TableCell>
                    <TableCell>{log.profiles?.full_name || log.profiles?.email || 'N/A'}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.booking_id ? `Booking: ${log.booking_id.slice(0, 8)}...` : 
                       log.payment_id ? `Payment: ${log.payment_id.slice(0, 8)}...` : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReprint(log)}
                      >
                        <Printer className="h-4 w-4 mr-2" />
                        Reprint
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
