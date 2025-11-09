import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQRManagement } from '@/hooks/useQRManagement';
import QRCodeTable from './QRCodeTable';
import QRCodeDialog from './QRCodeDialog';

export default function QRManagementPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQR, setEditingQR] = useState<any>(null);
  const { qrCodes, isLoading, createQRCode, updateQRCode, deleteQRCode } = useQRManagement();

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
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Create QR Code
        </Button>
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
    </div>
  );
}
