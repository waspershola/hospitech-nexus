import { useState } from 'react';
import { Globe, Plus, CheckCircle, XCircle, AlertCircle, Trash2 } from 'lucide-react';
import { ConfigCard } from '../shared/ConfigCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Domain {
  id: string;
  domain: string;
  status: string;
  verification_token: string;
  dns_instructions: any;
  certificate_status: string | null;
  error_message: string | null;
  created_at: string;
  verified_at: string | null;
}

export function DomainsTab() {
  const [newDomain, setNewDomain] = useState('');
  const queryClient = useQueryClient();

  const { data: domains, isLoading } = useQuery({
    queryKey: ['hotel-domains'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hotel_domains')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Domain[];
    },
  });

  const addDomainMutation = useMutation({
    mutationFn: async (domain: string) => {
      const { data, error } = await supabase.functions.invoke('manage-domain', {
        body: { action: 'add', domain },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success('Domain added successfully');
      setNewDomain('');
      queryClient.invalidateQueries({ queryKey: ['hotel-domains'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to add domain: ${error.message}`);
    },
  });

  const verifyDomainMutation = useMutation({
    mutationFn: async (domainId: string) => {
      const { data, error } = await supabase.functions.invoke('manage-domain', {
        body: { action: 'verify', domainId },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success('Domain verification started');
      queryClient.invalidateQueries({ queryKey: ['hotel-domains'] });
    },
    onError: (error: Error) => {
      toast.error(`Verification failed: ${error.message}`);
    },
  });

  const removeDomainMutation = useMutation({
    mutationFn: async (domainId: string) => {
      const { data, error } = await supabase.functions.invoke('manage-domain', {
        body: { action: 'remove', domainId },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success('Domain removed successfully');
      queryClient.invalidateQueries({ queryKey: ['hotel-domains'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove domain: ${error.message}`);
    },
  });

  const handleAddDomain = () => {
    if (!newDomain.trim()) {
      toast.error('Please enter a domain name');
      return;
    }
    addDomainMutation.mutate(newDomain.trim().toLowerCase());
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any }> = {
      pending: { variant: 'secondary', icon: AlertCircle },
      verifying: { variant: 'default', icon: AlertCircle },
      verified: { variant: 'default', icon: CheckCircle },
      error: { variant: 'destructive', icon: XCircle },
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <ConfigCard
        title="Custom Domain"
        description="Connect your hotel's custom domain to this portal"
        icon={Globe}
      >
        <div className="space-y-4">
          <Alert>
            <AlertDescription>
              Add a custom domain to make your guest portal accessible via your own domain (e.g., portal.yourhotel.com).
              You'll need access to your domain's DNS settings.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="domain">Domain Name</Label>
              <Input
                id="domain"
                placeholder="portal.yourhotel.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                disabled={addDomainMutation.isPending}
              />
            </div>
            <Button
              onClick={handleAddDomain}
              disabled={addDomainMutation.isPending}
              className="mt-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Domain
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading domains...</div>
          ) : domains && domains.length > 0 ? (
            <div className="space-y-3">
              {domains.map((domain) => (
                <div
                  key={domain.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{domain.domain}</h4>
                        {getStatusBadge(domain.status)}
                      </div>
                      {domain.verified_at && (
                        <p className="text-sm text-muted-foreground">
                          Verified on {new Date(domain.verified_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {domain.status !== 'verified' && (
                        <Button
                          size="sm"
                          onClick={() => verifyDomainMutation.mutate(domain.id)}
                          disabled={verifyDomainMutation.isPending}
                        >
                          Verify
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={removeDomainMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Domain</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove {domain.domain}? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => removeDomainMutation.mutate(domain.id)}
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  {domain.status === 'pending' && (
                    <Alert>
                      <AlertDescription className="space-y-2">
                        <p className="font-medium">Configure DNS Records:</p>
                        <div className="bg-muted p-3 rounded font-mono text-sm space-y-1">
                          <div>Type: A</div>
                          <div>Name: @ (or your subdomain)</div>
                          <div>Value: 185.158.133.1</div>
                        </div>
                        <p className="text-xs">DNS changes may take up to 48 hours to propagate.</p>
                      </AlertDescription>
                    </Alert>
                  )}

                  {domain.error_message && (
                    <Alert variant="destructive">
                      <AlertDescription>{domain.error_message}</AlertDescription>
                    </Alert>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No custom domains configured yet.
            </div>
          )}
        </div>
      </ConfigCard>
    </div>
  );
}
