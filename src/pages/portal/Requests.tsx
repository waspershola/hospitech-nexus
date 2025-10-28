import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';

interface Request {
  id: string;
  type: string;
  note: string;
  status: string;
  created_at: string;
}

export default function PortalRequests() {
  const { tenantId } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;

    const fetchRequests = async () => {
      const { data, error } = await supabase
        .from('requests')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setRequests(data);
      }
      setLoading(false);
    };

    fetchRequests();

    // Real-time subscription
    const channel = supabase
      .channel('requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'requests',
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading requests...</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display text-charcoal mb-2">Service Requests</h1>
          <p className="text-muted-foreground">Track your requests</p>
        </div>
        <Button variant="gold" size="icon">
          <Plus className="w-5 h-5" />
        </Button>
      </div>

      <div className="space-y-4">
        {requests.map((request) => (
          <Card key={request.id} className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-medium text-charcoal capitalize">{request.type}</h3>
                <p className="text-sm text-muted-foreground">
                  {new Date(request.created_at).toLocaleString()}
                </p>
              </div>
              <Badge className={getStatusColor(request.status)}>
                {request.status.replace('_', ' ')}
              </Badge>
            </div>
            {request.note && (
              <p className="text-sm text-muted-foreground">{request.note}</p>
            )}
          </Card>
        ))}
      </div>

      {requests.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No requests yet. Tap the + button to create one.
        </div>
      )}
    </div>
  );
}