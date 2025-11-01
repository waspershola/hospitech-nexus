import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, Mail, Phone, User, Calendar, DollarSign, FileText, MessageSquare, Edit, Wallet as WalletIcon } from 'lucide-react';
import { useGuestCommunications } from '@/hooks/useGuestCommunications';
import { format } from 'date-fns';

export default function GuestProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tenantId } = useAuth();
  const { communications, addCommunication } = useGuestCommunications(id);

  const { data: guest, isLoading } = useQuery({
    queryKey: ['guest-profile', id, tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('guests')
        .select('*')
        .eq('id', id!)
        .eq('tenant_id', tenantId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id && !!tenantId,
  });

  const { data: bookings } = useQuery({
    queryKey: ['guest-bookings', id, tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, room:rooms(number, type)')
        .eq('guest_id', id!)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!id && !!tenantId,
  });

  const { data: payments } = useQuery({
    queryKey: ['guest-payments', id, tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('guest_id', id!)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!id && !!tenantId,
  });

  const { data: wallet } = useQuery({
    queryKey: ['guest-wallet', id, tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('owner_id', id!)
        .eq('wallet_type', 'guest')
        .eq('tenant_id', tenantId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!id && !!tenantId,
  });

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!guest) {
    return <div className="p-6">Guest not found</div>;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'inactive': return 'secondary';
      case 'blacklisted': return 'destructive';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/guests')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-display font-bold">Guest Profile</h1>
        </div>
        <Button onClick={() => navigate(`/dashboard/guests/${id}/edit`)}>
          <Edit className="h-4 w-4 mr-2" />
          Edit Profile
        </Button>
      </div>

      {/* Header Card */}
      <Card className="rounded-2xl shadow-card">
        <CardContent className="pt-6">
          <div className="flex items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarFallback className="text-2xl font-bold">
                {guest.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-display font-bold">{guest.name}</h2>
                <Badge variant={getStatusColor(guest.status || 'active')}>
                  {guest.status || 'active'}
                </Badge>
                {guest.tags && Array.isArray(guest.tags) && guest.tags.length > 0 && (
                  <div className="flex gap-2">
                    {guest.tags.map((tag: any) => (
                      <Badge key={tag} variant="outline">{String(tag)}</Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span className="text-sm">{guest.email || 'No email'}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span className="text-sm">{guest.phone || 'No phone'}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span className="text-sm">{guest.id_number || 'No ID'}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">Since {format(new Date(guest.created_at), 'MMM yyyy')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <Separator className="my-6" />
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{guest.total_bookings || 0}</div>
              <div className="text-sm text-muted-foreground">Total Stays</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">₦{(guest.total_spent || 0).toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Total Spent</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">₦{(wallet?.balance || 0).toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Wallet Balance</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {guest.last_stay_date ? format(new Date(guest.last_stay_date), 'MMM dd') : 'N/A'}
              </div>
              <div className="text-sm text-muted-foreground">Last Stay</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="bookings">Booking History</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="wallet">Wallet</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                  <p className="text-lg">{guest.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="text-lg">{guest.email || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Phone</label>
                  <p className="text-lg">{guest.phone || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">ID Number</label>
                  <p className="text-lg">{guest.id_number || '-'}</p>
                </div>
              </div>
              {guest.notes && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Notes</label>
                  <p className="text-lg">{guest.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bookings">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Booking History ({bookings?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {bookings?.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-semibold">Room {booking.room?.number} - {booking.room?.type}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(booking.check_in), 'MMM dd, yyyy')} - {format(new Date(booking.check_out), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">₦{booking.total_amount?.toLocaleString()}</p>
                      <Badge variant={booking.status === 'checked_out' ? 'secondary' : 'default'}>
                        {booking.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                {(!bookings || bookings.length === 0) && (
                  <p className="text-center text-muted-foreground py-8">No bookings found</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Payment History ({payments?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {payments?.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-semibold">{payment.method?.toUpperCase()}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(payment.created_at), 'MMM dd, yyyy HH:mm')}
                      </p>
                      {payment.transaction_ref && (
                        <p className="text-xs text-muted-foreground">Ref: {payment.transaction_ref}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">₦{payment.amount?.toLocaleString()}</p>
                      <Badge variant={payment.status === 'success' ? 'default' : 'secondary'}>
                        {payment.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                {(!payments || payments.length === 0) && (
                  <p className="text-center text-muted-foreground py-8">No payments found</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wallet">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <WalletIcon className="h-5 w-5" />
                Wallet Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {wallet ? (
                <div className="space-y-4">
                  <div className="text-center p-6 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">Current Balance</p>
                    <p className="text-4xl font-bold">₦{wallet.balance.toLocaleString()}</p>
                  </div>
                  <Button 
                    className="w-full"
                    onClick={() => navigate(`/dashboard/wallets?wallet=${wallet.id}`)}
                  >
                    View Full Wallet Details
                  </Button>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No wallet found for this guest</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="communications">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Communications ({communications.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {communications.map((comm: any) => (
                  <div key={comm.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{comm.type}</Badge>
                        <Badge variant={comm.direction === 'inbound' ? 'secondary' : 'default'}>
                          {comm.direction}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(comm.created_at), 'MMM dd, yyyy HH:mm')}
                      </span>
                    </div>
                    {comm.subject && <p className="font-semibold">{comm.subject}</p>}
                    {comm.message && <p className="text-sm text-muted-foreground mt-2">{comm.message}</p>}
                    <p className="text-xs text-muted-foreground mt-2">
                      By: {comm.sent_by_profile?.full_name || 'System'}
                    </p>
                  </div>
                ))}
                {communications.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No communications logged</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Internal Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {guest.notes ? (
                <div className="prose max-w-none">
                  <p>{guest.notes}</p>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No notes available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
