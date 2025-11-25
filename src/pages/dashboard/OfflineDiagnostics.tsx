import { OfflineDiagnostics } from '@/components/offline/OfflineDiagnostics';

export default function OfflineDiagnosticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display text-foreground mb-2">Offline Diagnostics</h1>
        <p className="text-muted-foreground">
          Test and verify offline desktop app functionality (Electron only)
        </p>
      </div>
      
      <OfflineDiagnostics />
    </div>
  );
}
