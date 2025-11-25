/**
 * OFFLINE-DESKTOP-V1: Update notification component
 * Shows update available toast and install prompt
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Download, RefreshCw } from 'lucide-react';
import { useAutoUpdate } from '@/hooks/useAutoUpdate';
import { toast } from 'sonner';

export function UpdateNotification() {
  const { status, downloadUpdate, installUpdate } = useAutoUpdate();
  const [showDialog, setShowDialog] = useState(false);

  // Show dialog when update is available
  if (status.available && !status.downloading && !status.downloaded && !showDialog) {
    setShowDialog(true);
  }

  // Auto-show install dialog when download completes
  if (status.downloaded && !showDialog) {
    setShowDialog(true);
  }

  const handleDownload = async () => {
    try {
      await downloadUpdate();
      toast.success('Update downloading in background');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to download update');
    }
  };

  const handleInstall = async () => {
    try {
      await installUpdate();
      // App will restart
    } catch (error: any) {
      toast.error(error?.message || 'Failed to install update');
    }
  };

  const handleDismiss = () => {
    setShowDialog(false);
  };

  // Don't render if not in Electron
  if (!window.electronAPI) {
    return null;
  }

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {status.downloaded ? (
              <>
                <RefreshCw className="h-5 w-5 text-primary" />
                Update Ready to Install
              </>
            ) : (
              <>
                <Download className="h-5 w-5 text-primary" />
                Update Available
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {status.info && (
              <>
                <div className="font-medium text-foreground mt-2">
                  Version {status.info.version}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Released: {new Date(status.info.releaseDate).toLocaleDateString()}
                </div>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Release Notes */}
          {status.info?.releaseNotes && (
            <div className="rounded-md bg-muted p-3 text-sm">
              <div className="font-medium mb-2">What's New</div>
              <div className="text-muted-foreground whitespace-pre-wrap">
                {status.info.releaseNotes}
              </div>
            </div>
          )}

          {/* Download Progress */}
          {status.downloading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Downloading...</span>
                <span className="font-medium">{Math.round(status.progress)}%</span>
              </div>
              <Progress value={status.progress} className="h-2" />
            </div>
          )}

          {/* Error Message */}
          {status.error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {status.error}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {status.downloaded ? (
            <>
              <Button variant="outline" onClick={handleDismiss}>
                Install Later
              </Button>
              <Button onClick={handleInstall}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Install & Restart
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleDismiss}>
                Remind Me Later
              </Button>
              <Button 
                onClick={handleDownload}
                disabled={status.downloading}
              >
                {status.downloading ? (
                  <>Downloading...</>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Download Update
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
