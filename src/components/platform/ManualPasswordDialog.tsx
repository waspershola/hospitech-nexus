import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Check, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface ManualPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  password: string;
  userEmail: string;
}

export function ManualPasswordDialog({
  open,
  onOpenChange,
  password,
  userEmail,
}: ManualPasswordDialogProps) {
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(120); // 2 minutes
  const [showPassword, setShowPassword] = useState(true);

  useEffect(() => {
    if (!open) {
      setCountdown(120);
      setCopied(false);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          onOpenChange(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [open, onOpenChange]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      toast.success('Password copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy password');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Temporary Password
          </DialogTitle>
          <DialogDescription>
            Share this password securely with {userEmail}. It will only be shown once.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800 dark:text-amber-200">
                <p className="font-semibold mb-1">Security Warning</p>
                <p>This password will only be displayed once. Make sure to copy it now and share it through a secure channel.</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Temporary Password</label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="relative">
              <Input
                value={password}
                readOnly
                type={showPassword ? 'text' : 'password'}
                className="font-mono text-lg pr-12 select-all"
                onFocus={(e) => e.target.select()}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <p className="text-sm font-medium">Important Notes:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• User must change this password on first login</li>
              <li>• Password expires in 24 hours if not used</li>
              <li>• Share via secure channel (not email/SMS)</li>
              <li>• This dialog closes in {formatTime(countdown)}</li>
            </ul>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            Auto-close in {formatTime(countdown)}
          </p>
          <Button onClick={() => onOpenChange(false)}>
            I've Copied It
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
