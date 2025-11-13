import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, AlertCircle, Database } from 'lucide-react';

interface PlatformFeeBackfillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PlatformFeeBackfillDialog({ open, onOpenChange }: PlatformFeeBackfillDialogProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<{
    total_requests: number;
    backfilled: number;
    skipped: number;
    errors: number;
    message: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runBackfill = async () => {
    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      console.log('[Backfill] Starting platform fee backfill...');
      
      const { data, error: invokeError } = await supabase.functions.invoke('backfill-platform-fees', {
        body: {},
      });

      if (invokeError) {
        console.error('[Backfill] Error:', invokeError);
        throw invokeError;
      }

      console.log('[Backfill] Result:', data);
      setResult(data);
      
      if (data.backfilled > 0) {
        toast.success(`Successfully backfilled ${data.backfilled} platform fees`, {
          description: `${data.skipped} skipped, ${data.errors} errors`,
        });
      } else {
        toast.info('No fees needed backfilling', {
          description: 'All platform fees are already recorded',
        });
      }
    } catch (err: any) {
      console.error('[Backfill] Error:', err);
      setError(err.message || 'Failed to run backfill script');
      toast.error('Backfill failed', {
        description: err.message,
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Backfill Platform Fees
          </DialogTitle>
          <DialogDescription>
            Populate missing platform fee ledger entries for past QR payments that were already collected.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This script will scan all paid QR requests and create platform fee ledger entries for payments
              that don't already have fees recorded. The process is safe and will not duplicate existing entries.
            </AlertDescription>
          </Alert>

          {isRunning && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing past payments...
              </div>
              <Progress value={undefined} className="w-full" />
            </div>
          )}

          {result && (
            <Alert className="border-primary">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold">Backfill Complete</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Total Requests:</div>
                    <div className="font-medium">{result.total_requests}</div>
                    
                    <div className="text-primary">Backfilled:</div>
                    <div className="font-medium text-primary">{result.backfilled}</div>
                    
                    <div>Skipped:</div>
                    <div className="font-medium">{result.skipped}</div>
                    
                    <div>Errors:</div>
                    <div className="font-medium">{result.errors > 0 ? `${result.errors} ⚠️` : result.errors}</div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{result.message}</p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isRunning}
          >
            Close
          </Button>
          <Button
            onClick={runBackfill}
            disabled={isRunning}
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running...
              </>
            ) : (
              'Run Backfill'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
