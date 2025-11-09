import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface ManualPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  password: string;
  userEmail?: string;
  userFullName?: string;
}

export function ManualPasswordDialog({
  open,
  onOpenChange,
  password,
  userEmail,
  userFullName,
}: ManualPasswordDialogProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(password);
    setCopied(true);
    toast.success('Password copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Temporary Password Created
          </DialogTitle>
          <DialogDescription>
            This password will only be shown once. Make sure to copy it and share it securely with the user.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {(userFullName || userEmail) && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">User</Label>
              <div className="text-sm">
                {userFullName && <div className="font-medium">{userFullName}</div>}
                {userEmail && <div className="text-muted-foreground">{userEmail}</div>}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="password">Temporary Password</Label>
            <div className="flex gap-2">
              <Input
                id="password"
                value={password}
                readOnly
                className="font-mono"
                type="text"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCopy}
              >
                {copied ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="rounded-lg bg-muted p-3 space-y-1">
            <p className="text-sm font-medium">Important:</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Share this password securely with the user</li>
              <li>User must change it on first login</li>
              <li>This dialog will close once you click "Done"</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
