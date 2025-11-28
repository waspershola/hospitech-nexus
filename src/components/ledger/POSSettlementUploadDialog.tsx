import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText } from 'lucide-react';
import { usePOSSettlementUpload } from '@/hooks/usePOSSettlementUpload';

interface POSSettlementUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function POSSettlementUploadDialog({ open, onOpenChange }: POSSettlementUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [providerName, setProviderName] = useState('');
  const [settlementDate, setSettlementDate] = useState('');
  const [columnMapping, setColumnMapping] = useState({
    amount: 'Amount',
    date: 'Date',
    stan: 'STAN',
    rrn: 'RRN',
    terminal_id: 'Terminal ID',
    approval_code: 'Approval Code',
    card_type: 'Card Type',
    card_last4: 'Card Last 4',
    merchant_name: 'Merchant Name'
  });

  const uploadMutation = usePOSSettlementUpload();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
      } else {
        alert('Please select a CSV file');
      }
    }
  };

  const handleUpload = async () => {
    if (!file || !providerName || !settlementDate) {
      alert('Please fill in all required fields');
      return;
    }

    await uploadMutation.mutateAsync({
      file,
      providerName,
      settlementDate,
      columnMapping
    });

    // Reset form on success
    if (!uploadMutation.isError) {
      setFile(null);
      setProviderName('');
      setSettlementDate('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload POS Settlement File</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="file-upload">Settlement File (CSV)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="file-upload"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="flex-1"
              />
              {file && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>{file.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Provider Name */}
          <div className="space-y-2">
            <Label htmlFor="provider-name">Provider Name</Label>
            <Input
              id="provider-name"
              placeholder="e.g., Interswitch, Flutterwave"
              value={providerName}
              onChange={(e) => setProviderName(e.target.value)}
            />
          </div>

          {/* Settlement Date */}
          <div className="space-y-2">
            <Label htmlFor="settlement-date">Settlement Date</Label>
            <Input
              id="settlement-date"
              type="date"
              value={settlementDate}
              onChange={(e) => setSettlementDate(e.target.value)}
            />
          </div>

          {/* Column Mapping */}
          <div className="space-y-3 pt-4 border-t">
            <h4 className="font-medium text-sm">Column Mapping</h4>
            <p className="text-xs text-muted-foreground">
              Map your CSV column names to the required fields
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Amount Column</Label>
                <Input
                  placeholder="Amount"
                  value={columnMapping.amount}
                  onChange={(e) => setColumnMapping({ ...columnMapping, amount: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Date Column</Label>
                <Input
                  placeholder="Date"
                  value={columnMapping.date}
                  onChange={(e) => setColumnMapping({ ...columnMapping, date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">STAN Column</Label>
                <Input
                  placeholder="STAN"
                  value={columnMapping.stan}
                  onChange={(e) => setColumnMapping({ ...columnMapping, stan: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">RRN Column</Label>
                <Input
                  placeholder="RRN"
                  value={columnMapping.rrn}
                  onChange={(e) => setColumnMapping({ ...columnMapping, rrn: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Terminal ID Column</Label>
                <Input
                  placeholder="Terminal ID"
                  value={columnMapping.terminal_id}
                  onChange={(e) => setColumnMapping({ ...columnMapping, terminal_id: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Approval Code Column</Label>
                <Input
                  placeholder="Approval Code"
                  value={columnMapping.approval_code}
                  onChange={(e) => setColumnMapping({ ...columnMapping, approval_code: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={uploadMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!file || !providerName || !settlementDate || uploadMutation.isPending}
            >
              {uploadMutation.isPending ? (
                <>Uploading...</>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload & Process
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
