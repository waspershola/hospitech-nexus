import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Scheduler hook to trigger checkout reminder emails
 * Runs daily to send 24h and 2h reminders
 */
export function useCheckoutReminderScheduler() {
  const { tenantId } = useAuth();

  useEffect(() => {
    if (!tenantId) return;

    // Function to send reminders
    const sendReminders = async (hoursBefore: number) => {
      try {
        const { data, error } = await supabase.functions.invoke('send-checkout-reminder', {
          body: {
            tenant_id: tenantId,
            hours_before: hoursBefore,
          },
        });

        if (error) {
          console.error(`Error sending ${hoursBefore}h reminders:`, error);
        } else {
          console.log(`Sent ${hoursBefore}h checkout reminders:`, data);
        }
      } catch (err) {
        console.error(`Failed to send ${hoursBefore}h reminders:`, err);
      }
    };

    // Calculate time until next scheduled run
    const now = new Date();
    
    // For 24h reminders: Run at 10 AM daily
    const next24h = new Date(now);
    next24h.setHours(10, 0, 0, 0);
    if (now > next24h) {
      next24h.setDate(next24h.getDate() + 1);
    }
    const ms24h = next24h.getTime() - now.getTime();

    // For 2h reminders: Run at 10 AM daily (will catch checkouts at 12 PM)
    const next2h = new Date(now);
    next2h.setHours(10, 0, 0, 0);
    if (now > next2h) {
      next2h.setDate(next2h.getDate() + 1);
    }
    const ms2h = next2h.getTime() - now.getTime();

    // Schedule 24h reminders
    const timer24h = setTimeout(() => {
      sendReminders(24);
      // Then run every 24 hours
      const interval24h = setInterval(() => sendReminders(24), 24 * 60 * 60 * 1000);
      return () => clearInterval(interval24h);
    }, ms24h);

    // Schedule 2h reminders
    const timer2h = setTimeout(() => {
      sendReminders(2);
      // Then run every 24 hours
      const interval2h = setInterval(() => sendReminders(2), 24 * 60 * 60 * 1000);
      return () => clearInterval(interval2h);
    }, ms2h);

    console.log(`Checkout reminders scheduled: 24h in ${Math.round(ms24h / 1000 / 60)} min, 2h in ${Math.round(ms2h / 1000 / 60)} min`);

    return () => {
      clearTimeout(timer24h);
      clearTimeout(timer2h);
    };
  }, [tenantId]);
}
