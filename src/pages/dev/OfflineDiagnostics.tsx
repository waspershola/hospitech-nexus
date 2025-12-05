/**
 * Developer-only Offline Diagnostics Page
 * Accessible at /dev/offline-diagnostics when in dev mode or debugEnabled
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  type FullDiagnosticsResult,
  type DiagnosticResult,
  type StoreCountsResult,
  type SnapshotVerification,
  type IndexedDBHealth
} from '@/lib/offline/offlineDiagnostics';
import { 
  RefreshCw, 
  Database, 
  Wifi, 
  WifiOff, 
  Monitor, 
  CheckCircle2, 
  XCircle, 
  Play,
  Home,
  AlertTriangle
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DevOfflineDiagnostics() {
  const { tenantId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fullResults, setFullResults] = useState<FullDiagnosticsResult | null>(null);
  const [individualResults, setIndividualResults] = useState<Record<string, any>>({});

  const runAllTests = async () => {
    setLoading(true);
    try {
      const results = await runAllDiagnostics(tenantId);
      setFullResults(results);
    } catch (e) {
      console.error('[DevDiagnostics] Error:', e);
    } finally {
      setLoading(false);
    }
  };

  const runIndividualTest = async (testName: string, testFn: () => Promise<any>) => {
    setLoading(true);
    try {
      const result = await testFn();
      setIndividualResults(prev => ({ ...prev, [testName]: result }));
    } catch (e) {
      setIndividualResults(prev => ({ ...prev, [testName]: { error: String(e) } }));
    } finally {
      setLoading(false);
    }
  };

  const StatusIcon = ({ ok }: { ok: boolean }) => 
    ok ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />;

  // Quick environment checks
  const electronCheck = checkElectronPresence();
  const offlineCheck = checkOfflineMode();

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Database className="h-6 w-6" />
              Offline Seeding Diagnostics
            </h1>
            <p className="text-muted-foreground text-sm">
              Developer tools for verifying IndexedDB seeding in Electron
            </p>
          </div>
          <Link to="/">
            <Button variant="outline" size="sm">
              <Home className="h-4 w-4 mr-2" />
              Home
            </Button>
          </Link>
        </div>

        {/* Warning Banner */}
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <div className="text-sm">
              <strong>Developer Only:</strong> This page is only accessible in development mode 
              or when <code className="px-1 bg-muted rounded">localStorage.debugEnabled = 'true'</code>
            </div>
          </CardContent>
        </Card>

        {/* Environment Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Environment Status</CardTitle>
            <CardDescription>Current runtime environment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                <span className="text-sm">Electron:</span>
                <StatusIcon ok={electronCheck.value as boolean} />
                <span className="text-xs text-muted-foreground">
                  {electronCheck.value ? 'Yes' : 'Browser'}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                {navigator.onLine ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                <span className="text-sm">Network:</span>
                <StatusIcon ok={navigator.onLine} />
                <span className="text-xs text-muted-foreground">
                  {navigator.onLine ? 'Online' : 'Offline'}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                <span className="text-sm">Tenant:</span>
                <Badge variant={tenantId ? 'default' : 'secondary'} className="text-xs">
                  {tenantId ? tenantId.slice(0, 8) + '...' : 'None'}
                </Badge>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm">Mode:</span>
                <Badge variant="outline" className="text-xs">
                  {offlineCheck.message}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Run All Tests */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Full Diagnostics</CardTitle>
              <CardDescription>Run all seeding verification tests</CardDescription>
            </div>
            <Button onClick={runAllTests} disabled={loading}>
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Run All Tests
            </Button>
          </CardHeader>
          {fullResults && (
            <CardContent>
              <div className="space-y-4">
                {/* IndexedDB Health */}
                <div>
                  <h4 className="text-sm font-medium mb-2">IndexedDB Health</h4>
                  <div className="flex items-center gap-2">
                    <StatusIcon ok={fullResults.indexedDBHealth.healthy} />
                    <span className="text-sm">
                      {fullResults.indexedDBHealth.healthy ? 'Healthy' : 'Not accessible'}
                    </span>
                    {fullResults.indexedDBHealth.error && (
                      <span className="text-xs text-red-500">{fullResults.indexedDBHealth.error}</span>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Store Counts */}
                {fullResults.storeCounts.counts && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Store Counts</h4>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                      {Object.entries(fullResults.storeCounts.counts).map(([store, count]) => (
                        <div key={store} className="text-center p-2 border rounded">
                          <div className="text-lg font-bold">{count}</div>
                          <div className="text-xs text-muted-foreground capitalize">
                            {store.replace(/([A-Z])/g, ' $1').trim()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Snapshots */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Snapshot Verification</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {Object.entries(fullResults.snapshots).map(([store, snap]) => (
                      <div key={store} className="p-3 border rounded">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium capitalize">{store}</span>
                          <StatusIcon ok={snap.hasData} />
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {snap.count} records
                        </div>
                        {snap.sampleIds && snap.sampleIds.length > 0 && (
                          <div className="text-xs text-muted-foreground truncate">
                            Sample: {snap.sampleIds[0]?.slice(0, 12)}...
                          </div>
                        )}
                        {snap.error && (
                          <div className="text-xs text-red-500">{snap.error}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Raw JSON */}
                <details>
                  <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                    View Raw JSON
                  </summary>
                  <ScrollArea className="h-64 mt-2">
                    <pre className="text-xs p-2 bg-muted rounded">
                      {JSON.stringify(fullResults, null, 2)}
                    </pre>
                  </ScrollArea>
                </details>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Individual Tests */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Individual Tests</CardTitle>
            <CardDescription>Run specific diagnostic functions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <Button 
                variant="outline" 
                size="sm"
                disabled={loading}
                onClick={() => runIndividualTest('tenantDB', () => checkTenantDBInit(tenantId || ''))}
              >
                Check Tenant DB
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                disabled={loading}
                onClick={() => runIndividualTest('storeCounts', () => getStoreCounts(tenantId || ''))}
              >
                Get Store Counts
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                disabled={loading}
                onClick={() => runIndividualTest('rooms', () => verifyRoomsSnapshot(tenantId || ''))}
              >
                Verify Rooms
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                disabled={loading}
                onClick={() => runIndividualTest('bookings', () => verifyBookingsSnapshot(tenantId || ''))}
              >
                Verify Bookings
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                disabled={loading}
                onClick={() => runIndividualTest('guests', () => verifyGuestsSnapshot(tenantId || ''))}
              >
                Verify Guests
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                disabled={loading}
                onClick={() => runIndividualTest('indexedDB', checkIndexedDBHealth)}
              >
                Check IndexedDB Health
              </Button>
            </div>

            {Object.keys(individualResults).length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Results</h4>
                <ScrollArea className="h-48">
                  <pre className="text-xs p-2 bg-muted rounded">
                    {JSON.stringify(individualResults, null, 2)}
                  </pre>
                </ScrollArea>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Help */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Help</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>
              <strong>Enable diagnostics panel in dashboard:</strong>
              <br />
              <code className="text-xs bg-muted px-1 rounded">localStorage.setItem('showOfflineDiagnostics', 'true')</code>
            </p>
            <p>
              <strong>Disable this dev route:</strong>
              <br />
              <code className="text-xs bg-muted px-1 rounded">localStorage.removeItem('debugEnabled')</code>
            </p>
            <p className="text-muted-foreground">
              Timestamp: {fullResults?.timestamp || 'Not run yet'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
