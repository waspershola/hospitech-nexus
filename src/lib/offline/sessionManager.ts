/**
 * Session Manager - Phase 2
 * Manages tenant session state and authentication context
 */

import { tenantDBManager } from './tenantDBManager';
import type { TenantSession } from './offlineTypes';

class SessionManager {
  private currentSession: TenantSession | null = null;
  private sessionListeners: Set<(session: TenantSession | null) => void> = new Set();

  /**
   * Initialize session from storage
   */
  async initializeSession(): Promise<TenantSession | null> {
    // Try to load from last active tenant
    const lastTenantId = localStorage.getItem('luxhp_last_tenant_id');
    
    if (lastTenantId) {
      try {
        const session = await tenantDBManager.getSession(lastTenantId);
        if (session && session.expires_at > Date.now()) {
          this.currentSession = session;
          this.notifyListeners();
          console.log(`[SessionManager] Restored session for tenant: ${lastTenantId}`);
          return session;
        } else {
          console.log(`[SessionManager] Session expired for tenant: ${lastTenantId}`);
        }
      } catch (error) {
        console.error('[SessionManager] Failed to restore session:', error);
      }
    }

    return null;
  }

  /**
   * Set current session
   */
  async setSession(
    tenantId: string,
    userId: string,
    accessToken: string,
    refreshToken: string,
    roles: string[],
    expiresIn: number = 3600
  ): Promise<void> {
    const session: TenantSession = {
      tenant_id: tenantId,
      user_id: userId,
      access_token: accessToken,
      refresh_token: refreshToken,
      roles,
      expires_at: Date.now() + expiresIn * 1000,
      last_active: Date.now(),
    };

    await tenantDBManager.saveSession(session);
    this.currentSession = session;
    
    // Remember last tenant
    localStorage.setItem('luxhp_last_tenant_id', tenantId);
    
    this.notifyListeners();
    console.log(`[SessionManager] Session set for tenant: ${tenantId}`);
  }

  /**
   * Get current session
   */
  getSession(): TenantSession | null {
    return this.currentSession;
  }

  /**
   * Get current tenant ID
   */
  getTenantId(): string | null {
    return this.currentSession?.tenant_id || null;
  }

  /**
   * Get current user ID
   */
  getUserId(): string | null {
    return this.currentSession?.user_id || null;
  }

  /**
   * Check if session is valid
   */
  isSessionValid(): boolean {
    if (!this.currentSession) return false;
    return this.currentSession.expires_at > Date.now();
  }

  /**
   * Update last active timestamp
   */
  async updateActivity(): Promise<void> {
    if (!this.currentSession) return;

    this.currentSession.last_active = Date.now();
    await tenantDBManager.saveSession(this.currentSession);
  }

  /**
   * Clear current session
   */
  async clearSession(): Promise<void> {
    if (!this.currentSession) return;

    const tenantId = this.currentSession.tenant_id;
    
    await tenantDBManager.clearSession(tenantId);
    this.currentSession = null;
    
    localStorage.removeItem('luxhp_last_tenant_id');
    
    this.notifyListeners();
    console.log(`[SessionManager] Session cleared for tenant: ${tenantId}`);
  }

  /**
   * Switch tenant (clears current session and data)
   */
  async switchTenant(newTenantId: string): Promise<void> {
    if (this.currentSession) {
      await this.clearSession();
      await tenantDBManager.closeTenantDB(this.currentSession.tenant_id);
    }

    // Open new tenant's database (will be populated on next login/sync)
    await tenantDBManager.openTenantDB(newTenantId);
    console.log(`[SessionManager] Switched to tenant: ${newTenantId}`);
  }

  /**
   * Subscribe to session changes
   */
  subscribe(listener: (session: TenantSession | null) => void): () => void {
    this.sessionListeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.sessionListeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of session change
   */
  private notifyListeners(): void {
    for (const listener of this.sessionListeners) {
      listener(this.currentSession);
    }
  }

  /**
   * Get access token (with validation)
   */
  getAccessToken(): string | null {
    if (!this.isSessionValid()) {
      console.warn('[SessionManager] Session expired');
      return null;
    }
    return this.currentSession?.access_token || null;
  }

  /**
   * Check if user has role
   */
  hasRole(role: string): boolean {
    return this.currentSession?.roles.includes(role) || false;
  }
}

// Singleton instance
export const sessionManager = new SessionManager();
