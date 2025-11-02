import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { usePasswordReset } from '@/hooks/usePasswordReset';
import { Loader2, KeyRound, Copy, Check, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Staff } from '@/hooks/useStaffManagement';

interface ResetPasswordModalProps {
  staff: Staff | null;
  open: boolean;
  onClose: () => void;
}

export function ResetPasswordModal({ staff, open, onClose }: ResetPasswordModalProps) {
  const { resetPassword } = usePasswordReset();
  const [resetResult, setResetResult] = useState<{ password: string; email_sent: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleReset = async () => {
    if (!staff) return;
    const result = await resetPassword.mutateAsync(staff.id);
    if (result?.data?.new_password) {
      setResetResult({
        password: result.data.new_password,
        email_sent: result.data.email_sent || false,
      });
    } else {
      // If no password returned, close the modal
      onClose();
    }
  };

  const handleCopy = async () => {
    if (resetResult?.password) {
      await navigator.clipboard.writeText(resetResult.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setResetResult(null);
    setCopied(false);
    onClose();
  };

  if (!staff) return null;

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-amber-600" />
            <AlertDialogTitle>
              {resetResult ? 'Password Reset Complete' : 'Reset Password'}
            </AlertDialogTitle>
          </div>
          
          {!resetResult ? (
            <AlertDialogDescription className="space-y-3 pt-2">
              <p>
                You are about to reset the password for <strong>{staff.full_name}</strong>.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  <strong>What will happen:</strong>
                </p>
                <ul className="text-sm text-amber-700 mt-2 space-y-1 list-disc list-inside">
                  <li>A new temporary password will be generated</li>
                  <li>An email will be sent to <strong>{staff.email}</strong></li>
                  <li>The staff member will be required to change it on next login</li>
                </ul>
              </div>
              <p className="text-sm text-muted-foreground">
                This action cannot be undone. The old password will no longer work.
              </p>
            </AlertDialogDescription>
          ) : (
            <div className="space-y-4 pt-2">
              {resetResult.email_sent && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
                  <Mail className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm text-green-800 font-medium">Email Sent Successfully</p>
                    <p className="text-xs text-green-700 mt-1">
                      The new password has been sent to <strong>{staff.email}</strong>
                    </p>
                  </div>
                </div>
              )}
              
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <p className="text-sm text-slate-700 font-medium mb-2">Temporary Password:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white border border-slate-300 rounded px-3 py-2 text-lg font-mono text-amber-600 font-bold">
                    {resetResult.password}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopy}
                    className="shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 mr-1 text-green-600" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-1" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {!resetResult.email_sent && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm text-amber-800">
                    <strong>⚠️ Email not sent.</strong> Please share this password manually with {staff.full_name}.
                  </p>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>🔒 Security:</strong> The staff member must change this password on their next login.
                </p>
              </div>
            </div>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          {!resetResult ? (
            <>
              <AlertDialogCancel disabled={resetPassword.isPending}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleReset}
                disabled={resetPassword.isPending}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {resetPassword.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <KeyRound className="mr-2 h-4 w-4" />
                    Reset Password
                  </>
                )}
              </AlertDialogAction>
            </>
          ) : (
            <Button onClick={handleClose} className="w-full">
              Close
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
