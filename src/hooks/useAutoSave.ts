import { useEffect, useMemo } from 'react';
import { toast } from 'sonner';

export function useAutoSave(
  saveFunction: () => Promise<void>,
  value: any,
  delay = 1000
) {
  const debouncedSave = useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    
    return async () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        try {
          await saveFunction();
          toast.success('Changes saved', { duration: 2000 });
        } catch (error) {
          console.error('Auto-save failed:', error);
          toast.error('Failed to save changes');
        }
      }, delay);
    };
  }, [saveFunction, delay]);

  useEffect(() => {
    if (value !== undefined && value !== null) {
      debouncedSave();
    }
  }, [value, debouncedSave]);
}
