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

      console.log('[GroupBillingCenter-FIX] Resolving group ID from param:', groupId);

      // Try direct group_bookings table lookup first
      const { data: directGroupData } = await supabase
        .from('group_bookings')
        .select('group_id')
        .eq('group_id', groupId)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (directGroupData) {
        console.log('[GroupBillingCenter-FIX] Direct group ID found:', directGroupData.group_id);
        setActualGroupId(directGroupData.group_id);
        return;
      }

      // If not found, try resolving from bookings metadata
      const { data: booking } = await supabase
        .from('bookings')
        .select('metadata')
        .eq('id', groupId)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (booking?.metadata && typeof booking.metadata === 'object' && 'group_id' in booking.metadata) {
        const resolvedGroupId = (booking.metadata as any).group_id;
        console.log('[GroupBillingCenter-FIX] Resolved group ID from booking:', resolvedGroupId);
        setActualGroupId(resolvedGroupId);
      } else {
        // Use original groupId as fallback
        setActualGroupId(groupId);
      }
    }

    resolveGroupId();
  }, [groupId, tenantId]);

  const { data, isLoading } = useGroupMasterFolio(actualGroupId);

  if (isLoading || !actualGroupId) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-48 lg:col-span-2" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (!data?.master_folio) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No group master folio found for this booking.</p>
            <Button onClick={() => navigate(-1)} className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { master_folio, child_folios, aggregated_balances } = data;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Group Billing Center</h1>
            <p className="text-muted-foreground mt-1">
              Master Folio: {master_folio.folio_number}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Real-time sync active</span>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Master Folio Summary */}
        <div className="lg:col-span-2">
          <GroupFolioSummaryCard
            masterFolio={master_folio}
            aggregatedBalances={aggregated_balances}
            childFoliosCount={child_folios.length}
          />
        </div>

        {/* Quick Actions */}
        <div>
          <GroupMasterActions
            masterFolioId={master_folio.id}
            groupBookingId={groupId || ''}
            childFolios={child_folios}
          />
        </div>
      </div>

      {/* Child Folios Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Child Folios ({child_folios.length})</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {child_folios.map((childFolio) => (
            <GroupChildFolioCard
              key={childFolio.id}
              folio={childFolio}
              masterFolioId={master_folio.id}
            />
          ))}
        </div>
      </div>

      {/* Tabbed Transaction View */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="master" className="w-full">
            <TabsList>
              <TabsTrigger value="master">Master Folio</TabsTrigger>
              <TabsTrigger value="all">All Transactions</TabsTrigger>
            </TabsList>
            
            <TabsContent value="master" className="mt-4">
              <FolioTransactionHistory folioId={master_folio.id} />
            </TabsContent>
            
            <TabsContent value="all" className="mt-4">
              <div className="space-y-6">
                {child_folios.map((childFolio) => (
                  <div key={childFolio.id} className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      {childFolio.folio_number} - Room {childFolio.room?.number}
                    </h3>
                    <FolioTransactionHistory folioId={childFolio.id} />
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
