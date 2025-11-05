import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, Clock, User } from 'lucide-react';
import { useCheckoutReminders } from '@/hooks/useCheckoutReminders';
import { format } from 'date-fns';

export function CheckoutRemindersWidget() {
  const { data: reminders = [], isLoading } = useCheckoutReminders();

  if (isLoading) {
    return null;
  }

  if (reminders.length === 0) {
    return null;
  }

  const urgentReminders = reminders.filter(r => r.hoursUntilCheckout <= 2);
  const todayReminders = reminders.filter(r => r.hoursUntilCheckout > 2 && r.hoursUntilCheckout <= 12);

  return (
    <Card className="border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <CardTitle className="text-lg">Checkout Reminders</CardTitle>
          </div>
          <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
            {reminders.length} Due
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {urgentReminders.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-destructive flex items-center gap-1">
              <Clock className="w-3 h-3" />
              URGENT - Next 2 Hours
            </p>
            {urgentReminders.map((reminder) => (
              <div
                key={reminder.id}
                className="flex items-center justify-between p-2 bg-destructive/10 border border-destructive/30 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">Room {reminder.roomNumber}</span>
                    <Badge variant="destructive" className="text-xs">
                      {reminder.hoursUntilCheckout}h
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <User className="w-3 h-3" />
                    <span>{reminder.guestName}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {todayReminders.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Today
            </p>
            {todayReminders.slice(0, 5).map((reminder) => (
              <div
                key={reminder.id}
                className="flex items-center justify-between p-2 bg-background/50 border border-border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">Room {reminder.roomNumber}</span>
                    <span className="text-xs text-muted-foreground">
                      in {reminder.hoursUntilCheckout}h
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <User className="w-3 h-3" />
                    <span>{reminder.guestName}</span>
                  </div>
                </div>
              </div>
            ))}
            {todayReminders.length > 5 && (
              <p className="text-xs text-muted-foreground text-center">
                +{todayReminders.length - 5} more
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
