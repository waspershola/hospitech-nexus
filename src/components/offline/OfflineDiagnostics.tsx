/**
 * OFFLINE-DESKTOP-V1 + OFFLINE-PHASE2: Diagnostic Dashboard
 * Admin tool for testing and debugging offline functionality
 * Shows live network state from Electron bridge
 * Includes Force Offline toggle and Queue Status Panel
 * ELECTRON-ONLY-V1: This component is only functional in Electron desktop app
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  Database,
  Zap,
  TestTube,
  WifiOff,
  Wifi,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  CloudOff,
  RefreshCw,
  Monitor,
} from 'lucide-react';
import {
  seedTestData,
  clearTestData,
  verifyDataIntegrity,
  benchmarkPerformance,
  simulateOffline,
} from '@/lib/offline/offlineTestUtils';
import { useNetworkStore } from '@/state/networkStore';
import { useOfflineQueueV2 } from '@/hooks/useOfflineQueue.v2';
import { isElectronContext } from '@/lib/offline/offlineTypes';
import type { NetworkState } from '@/types/electron';

export function OfflineDiagnostics() {
  const { tenantId } = useAuth();
  const { online, hardOffline, lastChange } = useNetworkStore();
  const { pendingCount, failedCount, isSyncing, triggerSync } = useOfflineQueueV2();
  
  const [loading, setLoading] = useState<string | null>(null);
  const [forceOffline, setForceOffline] = useState(false);
  const [integrityResult, setIntegrityResult] = useState<{
    valid: boolean;
    errors: string[];
  } | null>(null);
  const [performanceResult, setPerformanceResult] = useState<{
    readLatency: number;
    writeLatency: number;
    queryLatency: number;
  } | null>(null);

  // Force offline mode functions
  const simulateOfflineMode = () => {
    const simulated: NetworkState = {
      online: false,
      hardOffline: true,
      lastChange: new Date().toISOString(),
    };
    window.__NETWORK_STATE__ = simulated;
    window.__HARD_OFFLINE__ = true;
    useNetworkStore.getState().setFromEvent(simulated);
    console.log('[OfflineDiagnostics] Force offline mode ENABLED');
    toast.warning('Force Offline Mode Enabled', {
      description: 'All network operations are now blocked',
    });
  };

  const restoreRealNetworkState = async () => {
    // Cast to extended type for network APIs
    const electronAPI = window.electronAPI as import('@/types/electron').ExtendedElectronAPI | undefined;
    
    if (electronAPI?.getNetworkState) {
      try {
        const actual = await electronAPI.getNetworkState();
        window.__NETWORK_STATE__ = actual;
        window.__HARD_OFFLINE__ = actual.hardOffline;
        useNetworkStore.getState().setFromEvent(actual);
      } catch (err) {
        console.warn('[OfflineDiagnostics] Failed to restore from Electron:', err);
      }
    } else {
      const fallback: NetworkState = {
        online: typeof navigator !== 'undefined' ? navigator.onLine : true,
        hardOffline: false,
        lastChange: new Date().toISOString(),
      };
      window.__NETWORK_STATE__ = fallback;
      window.__HARD_OFFLINE__ = false;
      useNetworkStore.getState().setFromEvent(fallback);
    }
    console.log('[OfflineDiagnostics] Force offline mode DISABLED');
    toast.success('Network State Restored', {
      description: 'Using real network status',
    });
  };

  const handleForceOfflineToggle = async (checked: boolean) => {
    setForceOffline(checked);
    if (checked) {
      simulateOfflineMode();
    } else {
      await restoreRealNetworkState();
    }
  };

  const handleSeedData = async () => {
    if (!tenantId) return;
    
    setLoading('seed');
    try {
      await seedTestData(tenantId);
      toast.success('Test data seeded successfully');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to seed test data');
    } finally {
      setLoading(null);
    }
  };

  const handleClearData = async () => {
    if (!tenantId) return;
    
    setLoading('clear');
    try {
      await clearTestData(tenantId);
      toast.success('Test data cleared successfully');
      setIntegrityResult(null);
      setPerformanceResult(null);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to clear test data');
    } finally {
      setLoading(null);
    }
  };

  const handleVerifyIntegrity = async () => {
    if (!tenantId) return;
    
    setLoading('verify');
    try {
      const result = await verifyDataIntegrity(tenantId);
      setIntegrityResult(result);
      
      if (result.valid) {
        toast.success('Data integrity verified - no errors found');
      } else {
        toast.error(`Data integrity errors found: ${result.errors.length}`);
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to verify data integrity');
    } finally {
      setLoading(null);
    }
  };

  const handleBenchmark = async () => {
    if (!tenantId) return;
    
    setLoading('benchmark');
    try {
      const result = await benchmarkPerformance(tenantId);
      setPerformanceResult(result);
      toast.success('Performance benchmark completed');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to run benchmark');
    } finally {
      setLoading(null);
    }
  };

  const handleSimulateOffline = () => {
    const cleanup = simulateOffline(10000); // 10 seconds
    toast.info('Offline mode simulated for 10 seconds');
  };

  // Don't render if not in Electron or not logged in
  // ELECTRON-ONLY-V1: Component is only functional in Electron desktop app
  const isElectron = isElectronContext();
  if (!isElectron || !tenantId) {
    return (
      <div className="space-y-6 p-6">
        <Card className="border-muted">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Offline Diagnostics
            </CardTitle>
            <CardDescription>
              Desktop App Only
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Offline diagnostics and testing tools are only available in the Electron desktop application.
              The web browser version operates in online-only mode.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-bold">Offline Diagnostics</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Testing and debugging tools for offline functionality
        </p>
      </div>

      {/* Force Offline Mode (Debug) */}
      <Card className="border-amber-500/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Force Offline Mode (Debug)
          </CardTitle>
          <CardDescription>
            Simulate offline state for testing without disconnecting network
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Switch
                checked={forceOffline}
                onCheckedChange={handleForceOfflineToggle}
              />
              <span className="text-sm">
                {forceOffline ? (
                  <span className="text-amber-500 font-medium">Forced Offline Active</span>
                ) : (
                  'Using Real Network State'
                )}
              </span>
            </div>
            {forceOffline && (
              <Badge variant="destructive" className="animate-pulse">
                <WifiOff className="h-3 w-3 mr-1" />
                OFFLINE
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Offline Queue Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CloudOff className="h-5 w-5" />
            Offline Queue Status
          </CardTitle>
          <CardDescription>
            Pending mutations queued for sync when online
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 bg-muted rounded-md">
              <span className="text-sm text-muted-foreground">Pending:</span>
              <Badge variant="default">{pendingCount}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-md">
              <span className="text-sm text-muted-foreground">Failed:</span>
              <Badge variant={failedCount > 0 ? "destructive" : "secondary"}>
                {failedCount}
              </Badge>
            </div>
          </div>
          <Button
            onClick={triggerSync}
            disabled={isSyncing || pendingCount === 0 || hardOffline}
            className="w-full"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Manual Sync Now
              </>
            )}
          </Button>
          {hardOffline && pendingCount > 0 && (
            <p className="text-xs text-muted-foreground text-center">
              Sync disabled while offline. Will auto-sync when connection is restored.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Live Network State */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {online && !hardOffline ? (
              <Wifi className="h-5 w-5 text-green-600" />
            ) : (
              <WifiOff className="h-5 w-5 text-destructive" />
            )}
            Live Network State
          </CardTitle>
          <CardDescription>
            Real-time network status from Electron bridge
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Online:</span>
              <Badge variant={online ? "default" : "destructive"}>
                {online ? "Yes" : "No"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Hard Offline:</span>
              <Badge variant={hardOffline ? "destructive" : "secondary"}>
                {hardOffline ? "Yes" : "No"}
              </Badge>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Last Change:</span>
            <span className="text-sm font-mono">{lastChange || 'N/A'}</span>
          </div>
          
          <div className="pt-4 border-t">
            <span className="text-sm font-medium">window.__NETWORK_STATE__:</span>
            <pre className="text-xs bg-muted p-3 rounded mt-2 overflow-auto">
              {JSON.stringify(window.__NETWORK_STATE__, null, 2)}
            </pre>
          </div>
          
          <div>
            <span className="text-sm font-medium">window.__HARD_OFFLINE__:</span>
            <Badge variant="outline" className="ml-2">
              {String(window.__HARD_OFFLINE__)}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Test Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Test Data Management
          </CardTitle>
          <CardDescription>
            Seed and clear test data in IndexedDB for testing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={handleSeedData}
            disabled={loading !== null}
            className="w-full"
          >
            {loading === 'seed' ? 'Seeding...' : 'Seed Test Data'}
          </Button>
          <Button
            onClick={handleClearData}
            disabled={loading !== null}
            variant="outline"
            className="w-full"
          >
            {loading === 'clear' ? 'Clearing...' : 'Clear Test Data'}
          </Button>
        </CardContent>
      </Card>

      {/* Data Integrity Check */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Data Integrity Check
          </CardTitle>
          <CardDescription>
            Verify data consistency and referential integrity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={handleVerifyIntegrity}
            disabled={loading !== null}
            className="w-full"
          >
            {loading === 'verify' ? 'Verifying...' : 'Verify Data Integrity'}
          </Button>

          {integrityResult && (
            <div className={`rounded-md p-4 ${
              integrityResult.valid 
                ? 'bg-green-500/10 border border-green-500/20' 
                : 'bg-destructive/10 border border-destructive/20'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {integrityResult.valid ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-600">
                      Data integrity verified
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-destructive" />
                    <span className="font-medium text-destructive">
                      {integrityResult.errors.length} error(s) found
                    </span>
                  </>
                )}
              </div>

              {integrityResult.errors.length > 0 && (
                <div className="space-y-1 mt-3">
                  {integrityResult.errors.map((error, index) => (
                    <div key={index} className="text-sm text-destructive">
                      • {error}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Benchmark */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Performance Benchmark
          </CardTitle>
          <CardDescription>
            Measure IndexedDB read/write/query performance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={handleBenchmark}
            disabled={loading !== null}
            className="w-full"
          >
            {loading === 'benchmark' ? 'Running...' : 'Run Performance Benchmark'}
          </Button>

          {performanceResult && (
            <div className="rounded-md bg-muted p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Read Latency:</span>
                <Badge variant="secondary">
                  <Clock className="h-3 w-3 mr-1" />
                  {performanceResult.readLatency.toFixed(2)}ms
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Write Latency:</span>
                <Badge variant="secondary">
                  <Clock className="h-3 w-3 mr-1" />
                  {performanceResult.writeLatency.toFixed(2)}ms
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Query Latency:</span>
                <Badge variant="secondary">
                  <Clock className="h-3 w-3 mr-1" />
                  {performanceResult.queryLatency.toFixed(2)}ms
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Offline Simulation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <WifiOff className="h-5 w-5" />
            Offline Simulation
          </CardTitle>
          <CardDescription>
            Simulate offline mode for 10 seconds
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleSimulateOffline}
            variant="outline"
            className="w-full"
          >
            Simulate Offline Mode
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
