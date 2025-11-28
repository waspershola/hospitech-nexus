import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Calendar } from 'lucide-react';
import { POSSettlementUploadDialog } from '@/components/ledger/POSSettlementUploadDialog';
import { POSReconciliationView } from '@/components/ledger/POSReconciliationView';
import { usePOSSettlementImports } from '@/hooks/usePOSSettlementImports';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

export default function POSReconciliation() {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedImportId, setSelectedImportId] = useState<string | null>(null);
  const { data: imports, isLoading } = usePOSSettlementImports();

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      'pending': 'outline',
      'processing': 'secondary',
      'completed': 'default',
      'failed': 'destructive'
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">POS Reconciliation</h2>
          <p className="text-muted-foreground">
            Match settlement files with internal ledger transactions
          </p>
        </div>
        <Button onClick={() => setUploadDialogOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Upload Settlement File
        </Button>
      </div>

      {selectedImportId ? (
        /* Reconciliation View */
        <div className="space-y-4">
          <Button
            variant="ghost"
            onClick={() => setSelectedImportId(null)}
          >
            ← Back to Imports
          </Button>
          <POSReconciliationView importId={selectedImportId} />
        </div>
      ) : (
        /* Imports List */
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All Imports</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {imports && imports.length > 0 ? (
              <div className="grid gap-4">
                {imports.map((imp: any) => (
                  <Card
                    key={imp.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setSelectedImportId(imp.id)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-base flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {imp.file_name}
                          </CardTitle>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(imp.settlement_date), 'MMM dd, yyyy')}
                            </span>
                            <span>Provider: {imp.provider_name}</span>
                          </div>
                        </div>
                        {getStatusBadge(imp.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">Total Records</div>
                          <div className="font-semibold">{imp.total_records}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Matched</div>
                          <div className="font-semibold text-green-600">{imp.matched_records}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Unmatched</div>
                          <div className="font-semibold text-orange-600">{imp.unmatched_records}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Uploaded</div>
                          <div className="font-semibold">
                            {format(new Date(imp.uploaded_at), 'MMM dd, HH:mm')}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Settlement Files</h3>
                  <p className="text-muted-foreground mb-4">
                    Upload your POS settlement files to start reconciliation
                  </p>
                  <Button onClick={() => setUploadDialogOpen(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload First File
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="pending" className="space-y-4">
            {imports?.filter((imp: any) => imp.status === 'pending' || imp.status === 'processing').map((imp: any) => (
              <Card key={imp.id} onClick={() => setSelectedImportId(imp.id)} className="cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-base">{imp.file_name}</CardTitle>
                </CardHeader>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {imports?.filter((imp: any) => imp.status === 'completed').map((imp: any) => (
              <Card key={imp.id} onClick={() => setSelectedImportId(imp.id)} className="cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-base">{imp.file_name}</CardTitle>
                </CardHeader>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      )}

      <POSSettlementUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
      />
    </div>
  );
}
