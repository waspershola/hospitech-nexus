import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard } from 'lucide-react';

export default function PortalPayments() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-display text-charcoal mb-2">Payments</h1>
        <p className="text-muted-foreground">View your bill and payment history</p>
      </div>

      <Card className="p-6 bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Current Balance</p>
            <p className="text-3xl font-bold text-charcoal">$0.00</p>
          </div>
          <CreditCard className="w-12 h-12 text-accent" />
        </div>
        <Button variant="gold" className="w-full">
          Pay Now
        </Button>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-display text-charcoal mb-4">Payment History</h3>
        <div className="text-center py-8 text-muted-foreground">
          No payment history available
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-display text-charcoal mb-4">Current Bill Details</h3>
        <div className="text-center py-8 text-muted-foreground">
          No charges yet
        </div>
      </Card>
    </div>
  );
}