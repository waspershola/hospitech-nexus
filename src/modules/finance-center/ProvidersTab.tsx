import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Settings, CheckCircle2, XCircle } from 'lucide-react';
import { useFinanceProviders } from '@/hooks/useFinanceProviders';
import { ProviderDrawer } from './ProviderDrawer';

export function ProvidersTab() {
  const { providers, isLoading } = useFinanceProviders();
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleAddProvider = () => {
    setSelectedProvider(null);
    setDrawerOpen(true);
  };

  const handleEditProvider = (id: string) => {
    setSelectedProvider(id);
    setDrawerOpen(true);
  };

  if (isLoading) {
    return <div>Loading providers...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-display font-semibold">Payment Providers</h2>
          <p className="text-muted-foreground">Configure and manage payment methods</p>
        </div>
        <Button onClick={handleAddProvider} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Provider
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {providers.map((provider) => (
          <Card key={provider.id} className="rounded-2xl shadow-card hover:shadow-luxury transition-all">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{provider.name}</CardTitle>
                  <CardDescription className="capitalize">{provider.type}</CardDescription>
                </div>
                {provider.status === 'active' ? (
                  <Badge variant="default" className="bg-semantic-success">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Active
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <XCircle className="w-3 h-3 mr-1" />
                    Inactive
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Transaction Fee</span>
                  <span className="font-semibold">{provider.fee_percent}%</span>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleEditProvider(provider.id)}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Configure
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ProviderDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        providerId={selectedProvider}
      />
    </div>
  );
}
