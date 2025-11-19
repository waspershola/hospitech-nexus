import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMultiFolios } from '@/hooks/useMultiFolios';

interface CreateFolioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  onSuccess?: (folioId: string) => void;
}

const FOLIO_TYPES = [
  { value: 'incidentals', label: 'Incidentals', description: 'Extra charges like minibar, laundry' },
  { value: 'corporate', label: 'Corporate', description: 'Company-paid charges' },
  { value: 'group', label: 'Group', description: 'Group booking charges' },
  { value: 'mini_bar', label: 'Mini Bar', description: 'Mini bar consumption' },
  { value: 'spa', label: 'Spa', description: 'Spa services' },
  { value: 'restaurant', label: 'Restaurant', description: 'Restaurant charges' },
];

export function CreateFolioDialog({ open, onOpenChange, bookingId, onSuccess }: CreateFolioDialogProps) {
  const [selectedType, setSelectedType] = useState<string>('');
  const { createFolio, isCreatingFolio } = useMultiFolios(bookingId);

  const handleCreate = async () => {
    if (!selectedType) return;

    createFolio(
      { folioType: selectedType },
      {
        onSuccess: (data) => {
          console.log('[CreateFolioDialog] CREATE-FOLIO-DIALOG-V1: Folio created', data.id);
          onSuccess?.(data.id);
          onOpenChange(false);
          setSelectedType('');
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Folio</DialogTitle>
          <DialogDescription>
            Create an additional folio to organize charges by type for this booking.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="folio-type">Folio Type</Label>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger id="folio-type">
                <SelectValue placeholder="Select folio type" />
              </SelectTrigger>
              <SelectContent>
                {FOLIO_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{type.label}</span>
                      <span className="text-xs text-muted-foreground">{type.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreatingFolio}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!selectedType || isCreatingFolio}>
            {isCreatingFolio ? 'Creating...' : 'Create Folio'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
