import { useState } from 'react';
import { Plus, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQRManagement } from '@/hooks/useQRManagement';
import QRCodeTable from './QRCodeTable';
import QRCodeDialog from './QRCodeDialog';
import BulkQRDialog from './BulkQRDialog';

export default function QRManagementPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [editingQR, setEditingQR] = useState<any>(null);
  const { qrCodes, isLoading, createQRCode, updateQRCode, deleteQRCode, bulkCreateQRCodes } = useQRManagement();

  const handleCreate = () => {
    setEditingQR(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (qr: any) => {
    setEditingQR(qr);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingQR(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">QR Code Management</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage QR codes for guest services
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsBulkDialogOpen(true)} variant="outline" className="gap-2">
            <Layers className="h-4 w-4" />
            Bulk Generate
          </Button>
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Create QR Code
          </Button>
        </div>
      </div>

      <QRCodeTable
        qrCodes={qrCodes}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={deleteQRCode}
      />

      <QRCodeDialog
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        qrCode={editingQR}
        onSave={async (data) => {
          if (editingQR) {
            await updateQRCode(editingQR.id, data as any);
          } else {
            await createQRCode(data as any);
          }
          handleDialogClose();
        }}
      />

      <BulkQRDialog
        open={isBulkDialogOpen}
        onOpenChange={setIsBulkDialogOpen}
        onGenerate={async (data) => {
          await bulkCreateQRCodes(
            data.scope,
            data.quantity,
            data.prefix,
            data.services,
            data.welcome_message
          );
        }}
      />
    </div>
  );
}
