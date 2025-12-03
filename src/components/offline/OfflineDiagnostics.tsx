/**
 * OFFLINE-DESKTOP-V1: Diagnostic Dashboard
 * Admin tool for testing and debugging offline functionality
 * Shows live network state from Electron bridge
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
} from 'lucide-react';
import {
  seedTestData,
  clearTestData,
  verifyDataIntegrity,
  benchmarkPerformance,
  simulateOffline,
} from '@/lib/offline/offlineTestUtils';
import { useNetworkStore } from '@/state/networkStore';

export function OfflineDiagnostics() {
  const { tenantId } = useAuth();
  const { online, hardOffline, lastChange } = useNetworkStore();
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
    const cleanup = simulateOffline(10000); // 10 seconds
    toast.info('Offline mode simulated for 10 seconds');
  };

  // Don't render if not in Electron or not logged in
  if (!window.electronAPI || !tenantId) {
    return null;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-bold">Offline Diagnostics</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Testing and debugging tools for offline functionality
        </p>
      </div>

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
