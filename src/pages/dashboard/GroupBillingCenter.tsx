import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGroupMasterFolio } from "@/hooks/useGroupMasterFolio";
import { GroupFolioSummaryCard } from "@/components/groups/GroupFolioSummaryCard";
import { GroupChildFolioCard } from "@/components/groups/GroupChildFolioCard";
import { GroupMasterActions } from "@/components/groups/GroupMasterActions";
import { FolioTransactionHistory } from "@/modules/billing/FolioTransactionHistory";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function GroupBillingCenter() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { tenantId } = useAuth();
  const [actualGroupId, setActualGroupId] = useState<string | null>(null);

  // FIX: Extract actual group_id from metadata if groupId is a bookingId
  useEffect(() => {
    async function resolveGroupId() {
      if (!groupId || !tenantId) return;

      console.log('[GroupBillingCenter] Resolving group ID from:', groupId);

      // Try direct query first - groupId might already be correct
      const { data: directGroupData, error: directError } = await supabase
        .from('group_bookings')
        .select('group_id')
        .eq('group_id', groupId)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (!directError && directGroupData) {
        console.log('[GroupBillingCenter] Direct group ID found:', directGroupData.group_id);
        setActualGroupId(directGroupData.group_id);
        return;
      }

      // If not found, try resolving from bookings metadata
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('metadata')
        .eq('id', groupId)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (bookingError) {
        console.error('[GroupBillingCenter] Error resolving group ID:', bookingError);
        return;
      }

      if (booking?.metadata && typeof booking.metadata === 'object' && 'group_id' in booking.metadata) {
        const resolvedGroupId = (booking.metadata as any).group_id;
        console.log('[GroupBillingCenter] Resolved group ID from booking metadata:', resolvedGroupId);
        setActualGroupId(resolvedGroupId);
      } else {
        console.warn('[GroupBillingCenter] Could not resolve group ID from booking:', groupId);
        // Use original groupId as fallback
        setActualGroupId(groupId);
      }
    }

    resolveGroupId();
  }, [groupId, tenantId]);

  const { data, isLoading } = useGroupMasterFolio(actualGroupId);

  if (isLoading || !actualGroupId) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-48 w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!data?.master_folio) {
    return (
      <div className="container mx-auto py-8">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-semibold mb-4 text-destructive">
            Error Loading Group Billing
          </h2>
          <p className="text-muted-foreground mb-6">
            No group master folio found for this booking
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Group ID: {actualGroupId}
          </p>
          <Button onClick={() => navigate('/dashboard/front-desk')} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Front Desk
          </Button>
        </Card>
      </div>
    );
  }

  if (!data.master_folio) {
    return (
      <div className="container mx-auto py-8">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-semibold mb-4">No Master Folio Found</h2>
          <p className="text-muted-foreground mb-6">
            This group booking does not have a master folio yet. It will be created during check-in.
          </p>
          <Button onClick={() => navigate('/dashboard/front-desk')} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Front Desk
          </Button>
        </Card>
      </div>
    );
  }

  const { master_folio, child_folios, aggregated_balances, expected_totals = { room_count: 0, expected_total: 0 } } = data;

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/dashboard/front-desk')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Group Billing Center</h1>
            <p className="text-muted-foreground">
              Master Folio: {master_folio.folio_number}
            </p>
          </div>
        </div>
        <GroupMasterActions
          masterFolioId={master_folio.id}
          groupBookingId={groupId || ''}
          childFolios={child_folios}
        />
      </div>

      {/* Summary Card */}
      <GroupFolioSummaryCard
        masterFolio={master_folio}
        aggregatedBalances={aggregated_balances}
        childFoliosCount={child_folios.length}
        expectedTotals={expected_totals}
      />

      {/* Child Folios Grid */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Room Folios</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {child_folios.map((childFolio) => (
            <GroupChildFolioCard 
              key={childFolio.id} 
              folio={childFolio}
              masterFolioId={master_folio.id}
            />
          ))}
        </div>
      </div>

      {/* Transaction History */}
      <Card className="p-6">
        <h2 className="text-2xl font-semibold mb-4">Transaction History</h2>
        <Tabs defaultValue="master" className="w-full">
          <TabsList>
            <TabsTrigger value="master">Master Folio</TabsTrigger>
            {child_folios.map((folio) => (
              <TabsTrigger key={folio.id} value={folio.id}>
                Room {folio.room?.number || 'N/A'}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="master">
            <FolioTransactionHistory folioId={master_folio.id} />
          </TabsContent>

          {child_folios.map((folio) => (
            <TabsContent key={folio.id} value={folio.id}>
              <FolioTransactionHistory folioId={folio.id} />
            </TabsContent>
          ))}
        </Tabs>
      </Card>
    </div>
  );
}
