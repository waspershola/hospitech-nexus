/**
 * OFFLINE-DESKTOP-V1: Testing Utilities
 * Helper functions for testing offline functionality
 * OFFLINE-EXTREME-V1: Updated for schema v2
 */

import { tenantDBManager } from './tenantDBManager';
import type { CachedRoom, CachedBooking, CachedGuest, CachedFolio, CachedPayment } from './offlineTypes';

// Helper to create default cache fields
function defaultCacheFields() {
  const now = Date.now();
  return {
    cached_at: now,
    last_synced_at: now,
    schema_version: 2,
    sync_status: 'fresh' as const,
  };
}

/**
 * Seed test data into IndexedDB for testing
 */
export async function seedTestData(tenantId: string) {
  console.log('[OfflineTestUtils] SEED-TEST-DATA-V1', { tenantId });

  const db = await tenantDBManager.openTenantDB(tenantId);
  const cacheFields = defaultCacheFields();

  // Test rooms
  const testRooms: CachedRoom[] = [
    {
      id: 'room-101',
      tenant_id: tenantId,
      number: '101',
      floor: '1',
      status: 'available',
      category: { name: 'Standard', rate: 15000 },
      ...cacheFields,
    },
    {
      id: 'room-201',
      tenant_id: tenantId,
      number: '201',
      floor: '2',
      status: 'occupied',
      category: { name: 'Deluxe', rate: 25000 },
      ...cacheFields,
    },
  ];

  // Test guests
  const testGuests: CachedGuest[] = [
    {
      id: 'guest-001',
      tenant_id: tenantId,
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+2348012345678',
      id_number: 'A12345678',
      ...cacheFields,
    },
  ];

  // Test bookings
  const testBookings: CachedBooking[] = [
    {
      id: 'booking-001',
      tenant_id: tenantId,
      booking_reference: 'BK-001',
      guest_id: 'guest-001',
      room_id: 'room-201',
      check_in: new Date().toISOString(),
      check_out: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'checked_in',
      total_amount: 75000,
      metadata: {},
      ...cacheFields,
    },
  ];

  // Test folios
  const testFolios: CachedFolio[] = [
    {
      id: 'folio-001',
      tenant_id: tenantId,
      booking_id: 'booking-001',
      guest_id: 'guest-001',
      room_id: 'room-201',
      folio_number: 'F-001',
      folio_type: 'room',
      status: 'open',
      total_charges: 75000,
      total_payments: 50000,
      balance: 25000,
      created_at: new Date().toISOString(),
      ...cacheFields,
    },
  ];

  // Test payments
  const testPayments: CachedPayment[] = [
    {
      id: 'payment-001',
      tenant_id: tenantId,
      booking_id: 'booking-001',
      guest_id: 'guest-001',
      amount: 50000,
      method: 'cash',
      provider_id: 'provider-001',
      location_id: 'location-001',
      status: 'completed',
      stay_folio_id: 'folio-001',
      transaction_ref: 'OFF-001',
      recorded_by: 'staff-001',
      created_at: new Date().toISOString(),
      metadata: {
        provider_name: 'Cash',
        location_name: 'Front Desk',
      },
      ...cacheFields,
    },
  ];

  // Insert test data
  await Promise.all([
    ...testRooms.map(room => db.put('rooms', room)),
    ...testGuests.map(guest => db.put('guests', guest)),
    ...testBookings.map(booking => db.put('bookings', booking)),
    ...testFolios.map(folio => db.put('folios', folio)),
    ...testPayments.map(payment => db.put('payments', payment)),
  ]);

  console.log('[OfflineTestUtils] Test data seeded successfully', {
    rooms: testRooms.length,
    guests: testGuests.length,
    bookings: testBookings.length,
    folios: testFolios.length,
    payments: testPayments.length,
  });

  return {
    rooms: testRooms,
    guests: testGuests,
    bookings: testBookings,
    folios: testFolios,
    payments: testPayments,
  };
}

/**
 * Clear all test data from IndexedDB
 */
export async function clearTestData(tenantId: string) {
  console.log('[OfflineTestUtils] CLEAR-TEST-DATA-V1', { tenantId });

  await tenantDBManager.purgeTenantData(tenantId);
  
  console.log('[OfflineTestUtils] Test data cleared successfully');
}

/**
 * Verify data integrity after sync
 */
export async function verifyDataIntegrity(tenantId: string): Promise<{
  valid: boolean;
  errors: string[];
}> {
  console.log('[OfflineTestUtils] VERIFY-DATA-INTEGRITY-V1', { tenantId });

  const db = await tenantDBManager.openTenantDB(tenantId);
  const errors: string[] = [];

  try {
    // Check folios have valid totals
    const folios = await db.getAll('folios');
    for (const folio of folios) {
      const transactions = await db.getAllFromIndex('folio_transactions', 'by-folio', folio.id);
      
      const charges = transactions
        .filter(t => t.transaction_type === 'charge')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
      const payments = transactions
        .filter(t => t.transaction_type === 'payment')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
      const expectedBalance = charges - payments;

      if (Math.abs(folio.balance - expectedBalance) > 0.01) {
        errors.push(
          `Folio ${folio.folio_number} balance mismatch: stored=${folio.balance}, calculated=${expectedBalance}`
        );
      }
    }

    // Check payments have valid references
    const payments = await db.getAll('payments');
    for (const payment of payments) {
      if (payment.stay_folio_id) {
        const folio = await db.get('folios', payment.stay_folio_id);
        if (!folio) {
          errors.push(`Payment ${payment.id} references non-existent folio ${payment.stay_folio_id}`);
        }
      }
    }

    // Check bookings have valid room/guest references
    const bookings = await db.getAll('bookings');
    for (const booking of bookings) {
      const room = await db.get('rooms', booking.room_id);
      const guest = await db.get('guests', booking.guest_id);
      
      if (!room) {
        errors.push(`Booking ${booking.booking_reference} references non-existent room ${booking.room_id}`);
      }
      if (!guest) {
        errors.push(`Booking ${booking.booking_reference} references non-existent guest ${booking.guest_id}`);
      }
    }

    console.log('[OfflineTestUtils] Data integrity check complete', {
      valid: errors.length === 0,
      errorCount: errors.length,
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  } catch (error) {
    console.error('[OfflineTestUtils] Data integrity check failed', error);
    return {
      valid: false,
      errors: [`Integrity check failed: ${String(error)}`],
    };
  }
}

/**
 * Benchmark IndexedDB performance
 */
export async function benchmarkPerformance(tenantId: string): Promise<{
  readLatency: number;
  writeLatency: number;
  queryLatency: number;
}> {
  console.log('[OfflineTestUtils] BENCHMARK-PERFORMANCE-V1', { tenantId });

  const db = await tenantDBManager.openTenantDB(tenantId);
  const cacheFields = defaultCacheFields();

  // Read benchmark (100 reads)
  const readStart = performance.now();
  for (let i = 0; i < 100; i++) {
    await db.getAll('rooms');
  }
  const readLatency = (performance.now() - readStart) / 100;

  // Write benchmark (100 writes)
  const writeStart = performance.now();
  for (let i = 0; i < 100; i++) {
    const testRoom: CachedRoom = {
      id: `bench-room-${i}`,
      tenant_id: tenantId,
      number: `BENCH-${i}`,
      floor: '1',
      status: 'available',
      category: { name: 'Test', rate: 10000 },
      ...cacheFields,
    };
    await db.put('rooms', testRoom);
  }
  const writeLatency = (performance.now() - writeStart) / 100;

  // Query benchmark (100 queries with index)
  const queryStart = performance.now();
  for (let i = 0; i < 100; i++) {
    await db.getAllFromIndex('rooms', 'by-status', 'available');
  }
  const queryLatency = (performance.now() - queryStart) / 100;

  // Cleanup benchmark data
  for (let i = 0; i < 100; i++) {
    await db.delete('rooms', `bench-room-${i}`);
  }

  console.log('[OfflineTestUtils] Performance benchmark complete', {
    readLatency: `${readLatency.toFixed(2)}ms`,
    writeLatency: `${writeLatency.toFixed(2)}ms`,
    queryLatency: `${queryLatency.toFixed(2)}ms`,
  });

  return {
    readLatency,
    writeLatency,
    queryLatency,
  };
}

/**
 * Simulate offline scenario for testing
 */
export function simulateOffline(durationMs = 5000): () => void {
  console.log('[OfflineTestUtils] SIMULATE-OFFLINE-V1', { durationMs });

  // Override navigator.onLine
  Object.defineProperty(navigator, 'onLine', {
    writable: true,
    value: false,
  });

  // Dispatch offline event
  window.dispatchEvent(new Event('offline'));

  // Auto-restore after duration
  const timeoutId = setTimeout(() => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
    window.dispatchEvent(new Event('online'));
    console.log('[OfflineTestUtils] Offline simulation ended');
  }, durationMs);

  // Return cleanup function
  return () => {
    clearTimeout(timeoutId);
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
    window.dispatchEvent(new Event('online'));
  };
}
