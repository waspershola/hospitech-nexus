import { useState } from 'react';
import { subDays, startOfDay, endOfDay } from 'date-fns';

export type DateRangePreset = 'today' | 'last7' | 'last30' | 'last90' | 'all';

export function useDateRangeFilter(defaultPreset: DateRangePreset = 'last30') {
  const [startDate, setStartDate] = useState<Date | undefined>(() => {
    if (defaultPreset === 'all') return undefined;
    const days = defaultPreset === 'today' ? 0 : parseInt(defaultPreset.replace('last', ''));
    return startOfDay(subDays(new Date(), days));
  });
  
  const [endDate, setEndDate] = useState<Date | undefined>(() => 
    endOfDay(new Date())
  );

  const applyPreset = (preset: DateRangePreset) => {
    if (preset === 'all') {
      setStartDate(undefined);
      setEndDate(undefined);
      return;
    }

    const now = new Date();
    setEndDate(endOfDay(now));

    if (preset === 'today') {
      setStartDate(startOfDay(now));
    } else {
      const days = parseInt(preset.replace('last', ''));
      setStartDate(startOfDay(subDays(now, days)));
    }
  };

  const reset = () => {
    applyPreset(defaultPreset);
  };

  const setCustomRange = (start: Date | undefined, end: Date | undefined) => {
    setStartDate(start ? startOfDay(start) : undefined);
    setEndDate(end ? endOfDay(end) : undefined);
  };

  return {
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    applyPreset,
    reset,
    setCustomRange,
  };
}
