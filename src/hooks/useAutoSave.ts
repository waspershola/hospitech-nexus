import { useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';

export function useAutoSave(
  saveFunction: () => Promise<void>,
  value: any,
  delay = 1000
) {
  const isInitialMount = useRef(true);
  const isSaving = useRef(false);

  const debouncedSave = useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    
    return async () => {
      clearTimeout(timeoutId);
      
      // Skip saving on initial mount
      if (isInitialMount.current) {
        isInitialMount.current = false;
        return;
      }

      // Prevent concurrent saves
      if (isSaving.current) {
        return;
      }
      
      timeoutId = setTimeout(async () => {
        try {
          isSaving.current = true;
          await saveFunction();
          toast.success('Changes saved', { duration: 2000 });
        } catch (error) {
          console.error('Auto-save failed:', error);
          toast.error(`Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
          isSaving.current = false;
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
