/**
 * Realtime Channel Registry
 * 
 * Centralized management of Supabase realtime subscriptions.
 * Used by offlineRuntimeController to coordinate disconnect/reconnect.
 */

import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface RealtimeSubscriptionConfig {
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  schema?: string;
  table: string;
  filter?: string;
  handler: (payload: any) => void;
}

export interface RealtimeBroadcastConfig {
  event: string;
  handler: (payload: any) => void;
}

export interface RealtimeChannelDescriptor {
  id: string;
  channelName: string;
  postgresChanges?: RealtimeSubscriptionConfig[];
  broadcasts?: RealtimeBroadcastConfig[];
  onSubscribed?: () => void;
  onError?: (error: any) => void;
}

class RealtimeRegistryImpl {
  private descriptors: Map<string, RealtimeChannelDescriptor> = new Map();
  private activeChannels: Map<string, RealtimeChannel> = new Map();

  /**
   * Register a channel descriptor (does not create the channel yet)
   */
  register(desc: RealtimeChannelDescriptor): string {
    const id = desc.id || `channel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.descriptors.set(id, { ...desc, id });
    console.log(`[RealtimeRegistry] Registered channel: ${id}`);
    return id;
  }

  /**
   * Unregister and unsubscribe a channel
   */
  unregister(id: string): void {
    const channel = this.activeChannels.get(id);
    if (channel) {
      try {
        supabase.removeChannel(channel);
      } catch (error) {
        console.warn(`[RealtimeRegistry] Error removing channel ${id}:`, error);
      }
      this.activeChannels.delete(id);
    }
    this.descriptors.delete(id);
    console.log(`[RealtimeRegistry] Unregistered channel: ${id}`);
  }

  /**
   * Subscribe a single channel by ID
   */
  subscribeOne(id: string): void {
    const desc = this.descriptors.get(id);
    if (!desc) {
      console.warn(`[RealtimeRegistry] No descriptor found for: ${id}`);
      return;
    }

    // Skip if already active
    if (this.activeChannels.has(id)) {
      return;
    }

    try {
      let channel = supabase.channel(desc.channelName);

      // Add postgres_changes subscriptions
      if (desc.postgresChanges) {
        for (const sub of desc.postgresChanges) {
          channel = channel.on(
            'postgres_changes' as any,
            {
              event: sub.event,
              schema: sub.schema || 'public',
              table: sub.table,
              filter: sub.filter,
            },
            sub.handler
          );
        }
      }

      // Add broadcast subscriptions
      if (desc.broadcasts) {
        for (const bc of desc.broadcasts) {
          channel = channel.on('broadcast' as any, { event: bc.event }, bc.handler);
        }
      }

      // Subscribe
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          desc.onSubscribed?.();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          desc.onError?.({ status });
        }
      });

      this.activeChannels.set(id, channel);
    } catch (error) {
      console.error(`[RealtimeRegistry] Error subscribing channel ${id}:`, error);
      desc.onError?.(error);
    }
  }

  /**
   * Subscribe all registered channels
   */
  subscribeAll(): void {
    console.log(`[RealtimeRegistry] Subscribing all ${this.descriptors.size} channels...`);
    for (const id of this.descriptors.keys()) {
      this.subscribeOne(id);
    }
  }

  /**
   * Unsubscribe all active channels (but keep descriptors)
   */
  unsubscribeAll(): void {
    console.log(`[RealtimeRegistry] Unsubscribing all ${this.activeChannels.size} channels...`);
    for (const [id, channel] of this.activeChannels) {
      try {
        supabase.removeChannel(channel);
      } catch (error) {
        console.warn(`[RealtimeRegistry] Error removing channel ${id}:`, error);
      }
    }
    this.activeChannels.clear();
  }

  /**
   * Get count of active channels
   */
  getActiveCount(): number {
    return this.activeChannels.size;
  }

  /**
   * Get count of registered descriptors
   */
  getRegisteredCount(): number {
    return this.descriptors.size;
  }

  /**
   * Check if a channel is registered
   */
  isRegistered(id: string): boolean {
    return this.descriptors.has(id);
  }

  /**
   * Check if a channel is active
   */
  isActive(id: string): boolean {
    return this.activeChannels.has(id);
  }
}

// Singleton instance
export const realtimeRegistry = new RealtimeRegistryImpl();
