/**
 * Developer-only Offline Diagnostics Panel
 * Only renders when localStorage.showOfflineDiagnostics === 'true'
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import {
  checkElectronPresence,
  checkOfflineMode,
  checkTenantDBInit,
  getStoreCounts,
  verifyBookingsSnapshot,
  verifyRoomsSnapshot,
  verifyGuestsSnapshot,
  checkIndexedDBHealth,
  runAllDiagnostics,
  type FullDiagnosticsResult
} from '@/lib/offline/offlineDiagnostics';
import { 
  RefreshCw, 
  Database, 
  Wifi, 
  WifiOff, 
  Monitor, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Play
} from 'lucide-react';

export function OfflineDiagnosticsPanel() {
  const { tenantId } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<FullDiagnosticsResult | null>(null);
  const [rawJson, setRawJson] = useState<string>('');

  // Check visibility flag on mount
  useEffect(() => {
    const flag = localStorage.getItem('showOfflineDiagnostics');
    setIsVisible(flag === 'true');
  }, []);

  // Don't render if not enabled
  if (!isVisible) return null;

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      const diagnosticResults = await runAllDiagnostics(tenantId);
      setResults(diagnosticResults);
      setRawJson(JSON.stringify(diagnosticResults, null, 2));
    } catch (e) {
      console.error('[DevDiagnostics] Error:', e);
    } finally {
      setLoading(false);
    }
  };

  const StatusBadge = ({ ok, label }: { ok: boolean; label: string }) => (
    <Badge variant={ok ? 'default' : 'destructive'} className="gap-1">
      {ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {label}
    </Badge>
  );

  const electronCheck = checkElectronPresence();
  const offlineCheck = checkOfflineMode();

  return (
    <div className="space-y-4 p-4 border border-dashed border-yellow-500/50 rounded-lg bg-yellow-500/5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-yellow-500" />
          <span className="text-sm font-medium text-yellow-600">Developer Diagnostics Panel</span>
        </div>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={runDiagnostics}
          disabled={loading}
        >
          {loading ? (
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Play className="h-4 w-4 mr-2" />
          )}
          Run Diagnostics
        </Button>
      </div>

      {/* Environment Status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Monitor className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs">Electron</span>
          </div>
          <StatusBadge ok={electronCheck.value as boolean} label={electronCheck.value ? 'Yes' : 'No'} />
        </Card>
        
        <Card className="p-3">
          <div className="flex items-center gap-2">
            {navigator.onLine ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            <span className="text-xs">Network</span>
          </div>
          <StatusBadge ok={navigator.onLine} label={navigator.onLine ? 'Online' : 'Offline'} />
        </Card>
        
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs">Tenant</span>
          </div>
          <Badge variant={tenantId ? 'default' : 'secondary'} className="truncate max-w-[120px]">
            {tenantId ? tenantId.slice(0, 8) + '...' : 'None'}
          </Badge>
        </Card>
        
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs">IndexedDB</span>
          </div>
          <StatusBadge 
            ok={results?.indexedDBHealth?.healthy ?? false} 
            label={results?.indexedDBHealth?.healthy ? 'Healthy' : 'Unknown'} 
          />
        </Card>
      </div>

      {/* Store Counts */}
      {results?.storeCounts?.counts && (
        <>
          <Separator />
          <div>
            <h4 className="text-sm font-medium mb-2">IndexedDB Store Counts</h4>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {Object.entries(results.storeCounts.counts).map(([store, count]) => (
                <Card key={store} className="p-2 text-center">
                  <div className="text-lg font-bold">{count}</div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {store.replace(/([A-Z])/g, ' $1').trim()}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Snapshot Verification */}
      {results?.snapshots && (
        <>
          <Separator />
          <div>
            <h4 className="text-sm font-medium mb-2">Snapshot Verification</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {Object.entries(results.snapshots).map(([store, snap]) => (
                <Card key={store} className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium capitalize">{store}</span>
                    <StatusBadge ok={snap.hasData} label={snap.hasData ? 'Seeded' : 'Empty'} />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {snap.count} records
                    {snap.sampleIds?.length > 0 && (
                      <span className="block truncate">
                        Sample: {snap.sampleIds[0]?.slice(0, 8)}...
                      </span>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Raw JSON Output */}
      {rawJson && (
        <>
          <Separator />
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              Raw JSON Output
            </summary>
            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-48">
              {rawJson}
            </pre>
          </details>
        </>
      )}

      <div className="text-xs text-muted-foreground">
        To disable: <code>localStorage.removeItem('showOfflineDiagnostics')</code>
      </div>
    </div>
  );
}
