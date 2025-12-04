/**
 * OFFLINE-DESKTOP-V1: Diagnostic Dashboard
 * Admin tool for testing and debugging offline functionality
 * GUARDED: Only renders and initializes in Electron context
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { isElectronContext } from '@/lib/environment/isElectron';
import {
  Database,
  Zap,
  TestTube,
  WifiOff,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';

// Lazy-loaded test utils (Electron-only)
let testUtils: {
  seedTestData: (tenantId: string) => Promise<any>;
  clearTestData: (tenantId: string) => Promise<void>;
  verifyDataIntegrity: (tenantId: string) => Promise<{ valid: boolean; errors: string[] }>;
  benchmarkPerformance: (tenantId: string) => Promise<{ readLatency: number; writeLatency: number; queryLatency: number }>;
  simulateOffline: (durationMs?: number) => () => void;
} | null = null;

export function OfflineDiagnostics() {
  // GUARD: Only render in Electron context
  if (!isElectronContext()) {
    return null;
  }

  const { tenantId } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [integrityResult, setIntegrityResult] = useState<{
    valid: boolean;
    errors: string[];
  } | null>(null);
  const [performanceResult, setPerformanceResult] = useState<{
    readLatency: number;
    writeLatency: number;
    queryLatency: number;
  } | null>(null);

  // Lazy load test utils only in Electron
  useEffect(() => {
    const loadTestUtils = async () => {
      try {
        const module = await import('@/lib/offline/offlineTestUtils');
        testUtils = {
          seedTestData: module.seedTestData,
          clearTestData: module.clearTestData,
          verifyDataIntegrity: module.verifyDataIntegrity,
          benchmarkPerformance: module.benchmarkPerformance,
          simulateOffline: module.simulateOffline,
        };
        setInitialized(true);
      } catch (err) {
        console.warn('[OfflineDiagnostics] Failed to load test utils:', err);
      }
    };
    loadTestUtils();
  }, []);

  // Don't render until initialized and logged in
  if (!initialized || !tenantId) {
    return null;
  }

  const handleSeedData = async () => {
    if (!tenantId || !testUtils) return;
    
    setLoading('seed');
    try {
      await testUtils.seedTestData(tenantId);
      toast.success('Test data seeded successfully');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to seed test data');
    } finally {
      setLoading(null);
    }
  };

  const handleClearData = async () => {
    if (!tenantId || !testUtils) return;
    
    setLoading('clear');
    try {
      await testUtils.clearTestData(tenantId);
      toast.success('Test data cleared successfully');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to clear test data');
    } finally {
      setLoading(null);
    }
  };

  const handleVerifyIntegrity = async () => {
    if (!tenantId || !testUtils) return;
    
    setLoading('integrity');
    try {
      const result = await testUtils.verifyDataIntegrity(tenantId);
      setIntegrityResult(result);
      if (result.valid) {
        toast.success('Data integrity verified');
      } else {
        toast.error(`Found ${result.errors.length} integrity issue(s)`);
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to verify data integrity');
    } finally {
      setLoading(null);
    }
  };

  const handleBenchmark = async () => {
    if (!tenantId || !testUtils) return;
    
    setLoading('benchmark');
    try {
      const result = await testUtils.benchmarkPerformance(tenantId);
      setPerformanceResult(result);
      toast.success('Benchmark complete');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to run benchmark');
    } finally {
      setLoading(null);
    }
  };

  const handleSimulateOffline = async () => {
    if (!testUtils) return;
    
    setLoading('simulate');
    try {
      toast.info('Simulating offline mode for 5 seconds...');
      const cleanup = testUtils.simulateOffline(5000);
      
      // Wait for simulation to complete
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      toast.success('Offline simulation complete');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to simulate offline');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Offline Diagnostics</h2>
        <p className="text-muted-foreground">
          Test and debug offline functionality (Electron only)
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Test Data Management */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4" />
              Test Data
            </CardTitle>
            <CardDescription>Seed or clear test data in IndexedDB</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              onClick={handleSeedData} 
              disabled={loading !== null}
              className="w-full"
              variant="outline"
            >
              {loading === 'seed' ? 'Seeding...' : 'Seed Test Data'}
            </Button>
            <Button 
              onClick={handleClearData} 
              disabled={loading !== null}
              className="w-full"
              variant="destructive"
            >
              {loading === 'clear' ? 'Clearing...' : 'Clear Test Data'}
            </Button>
          </CardContent>
        </Card>

        {/* Data Integrity Check */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TestTube className="h-4 w-4" />
              Integrity Check
            </CardTitle>
            <CardDescription>Verify data consistency in IndexedDB</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              onClick={handleVerifyIntegrity} 
              disabled={loading !== null}
              className="w-full"
              variant="outline"
            >
              {loading === 'integrity' ? 'Verifying...' : 'Verify Integrity'}
            </Button>
            
            {integrityResult && (
              <div className="mt-2 p-2 rounded-md bg-muted">
                <div className="flex items-center gap-2">
                  {integrityResult.valid ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm font-medium">
                    {integrityResult.valid ? 'All checks passed' : `${integrityResult.errors.length} issues found`}
                  </span>
                </div>
                {integrityResult.errors.length > 0 && (
                  <ul className="mt-2 text-xs text-destructive space-y-1">
                    {integrityResult.errors.slice(0, 5).map((err, i) => (
                      <li key={i}>• {err}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Performance Benchmark */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4" />
              Performance
            </CardTitle>
            <CardDescription>Benchmark IndexedDB operations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              onClick={handleBenchmark} 
              disabled={loading !== null}
              className="w-full"
              variant="outline"
            >
              {loading === 'benchmark' ? 'Running...' : 'Run Benchmark'}
            </Button>
            
            {performanceResult && (
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Read:</span>
                  <Badge variant="secondary">{performanceResult.readLatency.toFixed(2)}ms</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Write:</span>
                  <Badge variant="secondary">{performanceResult.writeLatency.toFixed(2)}ms</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Query:</span>
                  <Badge variant="secondary">{performanceResult.queryLatency.toFixed(2)}ms</Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Offline Simulation */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <WifiOff className="h-4 w-4" />
              Offline Simulation
            </CardTitle>
            <CardDescription>Test offline queue and sync</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleSimulateOffline} 
              disabled={loading !== null}
              className="w-full"
              variant="outline"
            >
              {loading === 'simulate' ? 'Simulating...' : 'Simulate 5s Offline'}
            </Button>
          </CardContent>
        </Card>

        {/* Status Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" />
              Environment
            </CardTitle>
            <CardDescription>Current runtime status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Electron:</span>
              <Badge variant="default">Active</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Online:</span>
              <Badge variant={navigator.onLine ? 'default' : 'secondary'}>
                {navigator.onLine ? 'Yes' : 'No'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tenant:</span>
              <Badge variant="outline" className="font-mono text-xs truncate max-w-[100px]">
                {tenantId?.slice(0, 8)}...
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
