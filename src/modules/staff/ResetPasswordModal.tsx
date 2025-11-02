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
import { Loader2, KeyRound } from 'lucide-react';
import type { Staff } from '@/hooks/useStaffManagement';

interface ResetPasswordModalProps {
  staff: Staff | null;
  open: boolean;
  onClose: () => void;
}

export function ResetPasswordModal({ staff, open, onClose }: ResetPasswordModalProps) {
  const { resetPassword } = usePasswordReset();

  const handleReset = async () => {
    if (!staff) return;
    await resetPassword.mutateAsync(staff.id);
    onClose();
  };

  if (!staff) return null;

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-amber-600" />
            <AlertDialogTitle>Reset Password</AlertDialogTitle>
          </div>
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
        </AlertDialogHeader>
        <AlertDialogFooter>
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
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
