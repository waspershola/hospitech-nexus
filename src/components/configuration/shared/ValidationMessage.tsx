import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ValidationMessageProps {
  type?: 'error' | 'success' | 'warning';
  message: string;
  className?: string;
}

export function ValidationMessage({ type = 'error', message, className }: ValidationMessageProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 text-xs mt-1',
        type === 'error' && 'text-destructive',
        type === 'success' && 'text-green-600',
        type === 'warning' && 'text-yellow-600',
        className
      )}
    >
      {type === 'error' && <AlertCircle className="h-3 w-3" />}
      {type === 'success' && <CheckCircle2 className="h-3 w-3" />}
      {type === 'warning' && <AlertCircle className="h-3 w-3" />}
      <span>{message}</span>
    </div>
  );
}
