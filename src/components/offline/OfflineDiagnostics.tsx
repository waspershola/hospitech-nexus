/**
 * OFFLINE-DESKTOP-V2: Diagnostic Dashboard
 * Admin tool for testing and debugging offline functionality
 * Enhanced with network store integration and better UX
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useNetworkStore } from '@/state/networkStore';
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
  Monitor,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import {
  seedTestData,
  clearTestData,
  verifyDataIntegrity,
  benchmarkPerformance,
  simulateOffline,
} from '@/lib/offline/offlineTestUtils';

/**
 * Debug card showing Electron and network detection status
 */
function ElectronDetectionCard() {
  const { online, hardOffline, lastChange } = useNetworkStore();
  const isElectron = !!window.electronAPI;
  const isDesktop = window.electronAPI?.isDesktop;
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Monitor className="h-5 w-5" />
          Environment Detection
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Electron API:</span>
              <Badge variant={isElectron ? "default" : "secondary"}>
                {isElectron ? "Available" : "Not Found"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">isDesktop Flag:</span>
              <Badge variant={isDesktop ? "default" : "secondary"}>
                {String(isDesktop ?? 'undefined')}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">navigator.onLine:</span>
              <Badge variant={navigator.onLine ? "default" : "destructive"}>
                {String(navigator.onLine)}
              </Badge>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Store Online:</span>
              <Badge variant={online ? "default" : "destructive"}>
                {String(online)}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Hard Offline:</span>
              <Badge variant={hardOffline ? "destructive" : "default"}>
                {String(hardOffline)}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Last Change:</span>
              <span className="text-xs">
                {lastChange ? new Date(lastChange).toLocaleTimeString() : 'N/A'}
              </span>
            </div>
          </div>
        </div>
        
        <Separator className="my-4" />
        
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Global State:</p>
          <pre className="text-xs bg-muted p-2 rounded-md overflow-auto">
{`window.__NETWORK_STATE__ = ${JSON.stringify(window.__NETWORK_STATE__, null, 2)}
window.__HARD_OFFLINE__ = ${String(window.__HARD_OFFLINE__)}`}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}

export function OfflineDiagnostics() {
  const { tenantId } = useAuth();
  const { hardOffline } = useNetworkStore();
  const [loading, setLoading] = useState<string | null>(null);
  const [integrityResult, setIntegrityResult] = useState<{
    valid: boolean;
    errors: string[];
  } | null>(null);
  const [performanceResult, setPerformanceResult] = useState<{
    readLatency: number;
    writeLatency: number;
    queryLatency: number;
  } | null>(null);

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
    simulateOffline(10000); // 10 seconds
    toast.info('Offline mode simulated for 10 seconds');
  };

  // Always show the detection card for debugging
  // Show helpful message if Electron is not detected
  if (!window.electronAPI) {
    return (
      <div className="space-y-6">
        <ElectronDetectionCard />
        
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Electron Desktop Not Detected</AlertTitle>
          <AlertDescription>
            <p className="mb-3">
              Full offline diagnostics require the Electron desktop app. 
              You're currently running in a web browser.
            </p>
            <p className="text-sm text-muted-foreground">
              The detection card above shows the current environment state for debugging purposes.
            </p>
          </AlertDescription>
        </Alert>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              How to Run Offline Desktop
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>To use the full offline diagnostics:</p>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
              <li>Build Electron: <code className="bg-muted px-1.5 py-0.5 rounded">npm run build:electron</code></li>
              <li>Run desktop: <code className="bg-muted px-1.5 py-0.5 rounded">npm run dev:electron</code></li>
              <li>Or build installer: <code className="bg-muted px-1.5 py-0.5 rounded">npm run dist</code></li>
            </ol>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show login required message
  if (!tenantId) {
    return (
      <div className="space-y-6">
        <ElectronDetectionCard />
        
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Login Required</AlertTitle>
          <AlertDescription>
            Please log in to access offline diagnostics tools.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Full diagnostics UI for Electron + logged-in users
  return (
    <div className="space-y-6">
      <ElectronDetectionCard />
      
      {/* Network Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            {hardOffline ? (
              <WifiOff className="h-5 w-5 text-destructive" />
            ) : (
              <Wifi className="h-5 w-5 text-green-500" />
            )}
            Network Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Badge variant={hardOffline ? "destructive" : "default"} className="text-sm">
            {hardOffline ? "Offline Mode Active" : "Online"}
          </Badge>
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
            {loading === 'seed' ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Seeding...</>
            ) : 'Seed Test Data'}
          </Button>
          <Button
            onClick={handleClearData}
            disabled={loading !== null}
            variant="outline"
            className="w-full"
          >
            {loading === 'clear' ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Clearing...</>
            ) : 'Clear Test Data'}
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
            {loading === 'verify' ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Verifying...</>
            ) : 'Verify Data Integrity'}
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
            {loading === 'benchmark' ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Running...</>
            ) : 'Run Performance Benchmark'}
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
