import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AuditLogDetailModalProps {
  log: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuditLogDetailModal({ log, open, onOpenChange }: AuditLogDetailModalProps) {
  if (!log) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Audit Log Detail</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Timestamp</div>
              <div className="text-sm">{format(new Date(log.created_at), 'MMM dd, yyyy HH:mm:ss')}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">User</div>
              <div className="text-sm">{log.profiles?.full_name || 'Unknown User'}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Action</div>
              <Badge>{log.action}</Badge>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Table</div>
              <div className="text-sm font-mono">{log.table_name}</div>
            </div>
          </div>

          {log.before_data && (
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-2">Before</div>
              <ScrollArea className="h-48 rounded-md border bg-muted/50 p-4">
                <pre className="text-xs">{JSON.stringify(log.before_data, null, 2)}</pre>
              </ScrollArea>
            </div>
          )}

          {log.after_data && (
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-2">After</div>
              <ScrollArea className="h-48 rounded-md border bg-muted/50 p-4">
                <pre className="text-xs">{JSON.stringify(log.after_data, null, 2)}</pre>
              </ScrollArea>
            </div>
          )}

          {log.ip_address && (
            <div>
              <div className="text-sm font-medium text-muted-foreground">IP Address</div>
              <div className="text-sm font-mono">{log.ip_address}</div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
