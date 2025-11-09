import { useState } from 'react';
import { MoreHorizontal, Download, Edit, Trash2, Copy, ExternalLink } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface QRCodeTableProps {
  qrCodes: any[];
  isLoading: boolean;
  onEdit: (qr: any) => void;
  onDelete: (qrId: string) => Promise<boolean>;
}

export default function QRCodeTable({ qrCodes, isLoading, onEdit, onDelete }: QRCodeTableProps) {
  const [previewQR, setPreviewQR] = useState<any>(null);

  const getQRUrl = (token: string) => {
    return `${window.location.origin}/qr/${token}`;
  };

  const handleCopyUrl = (token: string) => {
    navigator.clipboard.writeText(getQRUrl(token));
    toast.success('URL copied to clipboard');
  };

  const handleDownloadQR = (qr: any) => {
    const svg = document.getElementById(`qr-${qr.id}`)?.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');

      const downloadLink = document.createElement('a');
      downloadLink.download = `qr-${qr.display_name.replace(/\s+/g, '-')}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const handleDelete = async (qr: any) => {
    if (confirm(`Are you sure you want to delete "${qr.display_name}"?`)) {
      await onDelete(qr.id);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      active: 'default',
      inactive: 'secondary',
      expired: 'destructive',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (qrCodes.length === 0) {
    return (
      <div className="text-center py-12 border border-border rounded-lg bg-card">
        <p className="text-muted-foreground">No QR codes created yet.</p>
      </div>
    );
  }

  return (
    <>
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Display Name</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Services</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {qrCodes.map((qr) => (
              <TableRow key={qr.id}>
                <TableCell className="font-medium">{qr.display_name}</TableCell>
                <TableCell>{qr.assigned_to}</TableCell>
                <TableCell className="capitalize">{qr.scope.replace('_', ' ')}</TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {qr.services.slice(0, 2).map((service: string) => (
                      <Badge key={service} variant="outline" className="text-xs">
                        {service}
                      </Badge>
                    ))}
                    {qr.services.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{qr.services.length - 2}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(qr.status)}</TableCell>
                <TableCell>{format(new Date(qr.created_at), 'MMM d, yyyy')}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setPreviewQR(qr)}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Preview QR
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleCopyUrl(qr.token)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy URL
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownloadQR(qr)}>
                        <Download className="h-4 w-4 mr-2" />
                        Download QR
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onEdit(qr)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(qr)} className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Hidden QR codes for download */}
        {qrCodes.map((qr) => (
          <div key={qr.id} id={`qr-${qr.id}`} className="hidden">
            <QRCodeSVG value={getQRUrl(qr.token)} size={512} level="H" />
          </div>
        ))}
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewQR} onOpenChange={() => setPreviewQR(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{previewQR?.display_name}</DialogTitle>
          </DialogHeader>
          {previewQR && (
            <div className="space-y-4">
              <div className="flex justify-center p-6 bg-background rounded-lg">
                <QRCodeSVG value={getQRUrl(previewQR.token)} size={256} level="H" />
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Assigned To:</span>
                  <span className="font-medium">{previewQR.assigned_to}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Scope:</span>
                  <span className="font-medium capitalize">{previewQR.scope.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  {getStatusBadge(previewQR.status)}
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => handleCopyUrl(previewQR.token)} className="flex-1">
                  <Copy className="h-4 w-4 mr-2" />
                  Copy URL
                </Button>
                <Button onClick={() => handleDownloadQR(previewQR)} variant="outline" className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
