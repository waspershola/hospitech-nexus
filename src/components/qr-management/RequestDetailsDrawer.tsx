import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import { RequestDetailsPanel } from './RequestDetailsPanel';

interface RequestDetailsDrawerProps {
  request: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenChat?: () => void;
}

export function RequestDetailsDrawer({
  request,
  open,
  onOpenChange,
  onOpenChat,
}: RequestDetailsDrawerProps) {
  if (!request) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Request Details</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <RequestDetailsPanel 
            request={request} 
            showFolioLink={true}
            showPaymentInfo={true}
          />

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={onOpenChat}
              className="flex-1"
              variant="default"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Chat with Guest
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
