import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Mail, Printer, PlusCircle, ArrowLeftRight, XCircle } from "lucide-react";
import { useFolioPDF } from "@/hooks/useFolioPDF";
import { useToast } from "@/hooks/use-toast";
import type { GroupChildFolio } from "@/hooks/useGroupMasterFolio";

interface GroupMasterActionsProps {
  masterFolioId: string;
  groupBookingId: string;
  childFolios: GroupChildFolio[];
}

export function GroupMasterActions({
  masterFolioId,
  groupBookingId,
  childFolios,
}: GroupMasterActionsProps) {
  const { generatePDF, printFolio, isGenerating, isPrinting } = useFolioPDF();
  const { toast } = useToast();

  const handleDownloadPDF = () => {
    generatePDF({ folioId: masterFolioId });
  };

  const handleEmailPDF = () => {
    toast({
      title: "Coming Soon",
      description: "Email functionality for group master folios.",
    });
  };

  const handlePrintPDF = () => {
    printFolio({ folioId: masterFolioId });
  };

  const handleBatchPDF = async () => {
    try {
      toast({
        title: "Generating PDFs",
        description: `Exporting ${childFolios.length} child folios...`,
      });

      // Generate PDFs for all child folios in parallel
      const pdfPromises = childFolios.map(child => 
        generatePDF({ folioId: child.id })
      );

      await Promise.all(pdfPromises);

      toast({
        title: "Batch Export Complete",
        description: `Successfully exported ${childFolios.length} folio PDFs.`,
      });
    } catch (error) {
      console.error("Batch PDF export failed:", error);
      toast({
        title: "Export Failed",
        description: "Some PDFs could not be generated.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* PDF Actions */}
        <div className="space-y-2 pb-4 border-b">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Master Folio PDF</p>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={handleDownloadPDF}
            disabled={isGenerating}
          >
            <FileText className="mr-2 h-4 w-4" />
            {isGenerating ? "Generating..." : "Download PDF"}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={handleEmailPDF}
          >
            <Mail className="mr-2 h-4 w-4" />
            Email PDF
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={handlePrintPDF}
            disabled={isPrinting}
          >
            <Printer className="mr-2 h-4 w-4" />
            {isPrinting ? "Printing..." : "Print PDF"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={handleBatchPDF}
            disabled={isGenerating || childFolios.length === 0}
          >
            <FileText className="mr-2 h-4 w-4" />
            {isGenerating ? "Exporting..." : `Batch Export All (${childFolios.length})`}
          </Button>
        </div>

        {/* Folio Operations */}
        <div className="space-y-2 pt-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Folio Operations</p>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            disabled
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Direct Charge
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            disabled
          >
            <ArrowLeftRight className="mr-2 h-4 w-4" />
            Pull from Children
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start text-destructive hover:text-destructive"
            disabled
          >
            <XCircle className="mr-2 h-4 w-4" />
            Close All Folios
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
