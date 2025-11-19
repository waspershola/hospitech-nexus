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

export default function GroupBillingCenter() {
  const { groupBookingId } = useParams<{ groupBookingId: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useGroupMasterFolio(groupBookingId || null);

  if (isLoading) {
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
            groupBookingId={groupBookingId || ''}
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
