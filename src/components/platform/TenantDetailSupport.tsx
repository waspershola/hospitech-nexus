import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MessageSquare, Plus, Send } from 'lucide-react';
import { toast } from 'sonner';

interface TenantDetailSupportProps {
  tenantId: string;
}

export default function TenantDetailSupport({ tenantId }: TenantDetailSupportProps) {
  const queryClient = useQueryClient();
  const [noteText, setNoteText] = useState('');
  const [emailText, setEmailText] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch support notes/communications
  const { data: communications, isLoading } = useQuery({
    queryKey: ['tenant-communications', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('guest_communications')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    }
  });

  // Add internal note
  const addNote = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('guest_communications')
        .insert({
          tenant_id: tenantId,
          guest_id: tenantId, // Using tenant_id as guest_id for platform notes
          type: 'note',
          direction: 'internal',
          subject: 'Support Note',
          message: noteText,
          sent_by: user.id
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Note added');
      queryClient.invalidateQueries({ queryKey: ['tenant-communications', tenantId] });
      setNoteText('');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add note');
    }
  });

  // Send email to tenant
  const sendEmail = useMutation({
    mutationFn: async () => {
      // Get tenant owner email
      const { data: tenant } = await supabase
        .from('platform_tenants')
        .select('owner_email')
        .eq('id', tenantId)
        .single();

      if (!tenant) throw new Error('Tenant not found');

      const { error } = await supabase.functions.invoke('email-provider', {
        body: {
          to: tenant.owner_email,
          subject: emailSubject,
          html: `<p>${emailText.replace(/\n/g, '<br>')}</p>`,
          tenant_id: tenantId
        }
      });

      if (error) throw error;

      // Log communication
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('guest_communications')
          .insert({
            tenant_id: tenantId,
            guest_id: tenantId, // Using tenant_id as guest_id for platform communications
            type: 'email',
            direction: 'outbound',
            subject: emailSubject,
            message: emailText,
            sent_by: user.id,
            status: 'sent'
          });
      }
    },
    onSuccess: () => {
      toast.success('Email sent');
      queryClient.invalidateQueries({ queryKey: ['tenant-communications', tenantId] });
      setEmailText('');
      setEmailSubject('');
      setDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to send email');
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Send communication or add internal notes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Textarea
              placeholder="Add internal note (visible only to platform admins)..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={3}
            />
            <Button
              onClick={() => addNote.mutate()}
              disabled={!noteText.trim() || addNote.isPending}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              {addNote.isPending ? 'Adding...' : 'Add Note'}
            </Button>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Send className="h-4 w-4 mr-2" />
                Send Email to Owner
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Send Email</DialogTitle>
                <DialogDescription>
                  Send an email to the tenant owner
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Subject</label>
                  <Textarea
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="Email subject"
                    rows={1}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Message</label>
                  <Textarea
                    value={emailText}
                    onChange={(e) => setEmailText(e.target.value)}
                    placeholder="Email message"
                    rows={6}
                  />
                </div>
                <Button
                  onClick={() => sendEmail.mutate()}
                  disabled={!emailText.trim() || !emailSubject.trim() || sendEmail.isPending}
                  className="w-full"
                >
                  {sendEmail.isPending ? 'Sending...' : 'Send Email'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Communication History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Communication History
          </CardTitle>
          <CardDescription>All notes and communications with this tenant</CardDescription>
        </CardHeader>
        <CardContent>
          {!communications || communications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No communications yet
            </div>
          ) : (
            <div className="space-y-4">
              {communications.map((comm) => (
                <div
                  key={comm.id}
                  className="p-4 border rounded-lg space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={comm.type === 'note' ? 'secondary' : 'default'}>
                        {comm.type}
                      </Badge>
                      {comm.direction && (
                        <Badge variant="outline">{comm.direction}</Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(comm.created_at).toLocaleString()}
                    </span>
                  </div>
                  {comm.subject && (
                    <p className="font-medium">{comm.subject}</p>
                  )}
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {comm.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
