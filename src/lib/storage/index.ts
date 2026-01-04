/**
 * RemoteStorage Configuration and Instance
 * 
 * OFFLINE-FIRST ARCHITECTURE (following RemoteStorage.js best practices):
 * 
 * 1. All read operations use `maxAge: false` → always return from local cache
 * 2. All write operations go to local cache first → sync happens in background
 * 3. The app works fully offline, syncs when online and connected
 * 
 * Key insight from RS docs:
 * "If the maxAge requirement is set to false, or the library is in offline mode,
 * or no remote storage is connected, the promise will always be fulfilled with
 * data from the local store."
 */

import RemoteStorage from 'remotestoragejs';
import { resourcesModule } from './modules/resources';
import { categoriesModule } from './modules/categories';
import { topicsModule } from './modules/topics';
import { settingsModule } from './modules/settings';

// ============================================
// RemoteStorage Instance
// ============================================

export const remoteStorage = new RemoteStorage({
  // Enable local caching (IndexedDB) - essential for offline-first
  cache: true,
  
  // Change events configuration
  changeEvents: {
    local: true,      // Emit for local cache reads (fires on startup for cached items)
    window: true,     // Emit for changes from other tabs
    remote: true,     // Emit when remote changes are synced
    conflict: true,   // Emit when local/remote conflict occurs
  },
  
  // Debug logging in development
  logging: import.meta.env.DEV,
});

// ============================================
// Module Registration
// ============================================

remoteStorage.addModule(resourcesModule);
remoteStorage.addModule(categoriesModule);
remoteStorage.addModule(topicsModule);
remoteStorage.addModule(settingsModule);

// Claim read/write access (requested during OAuth)
remoteStorage.access.claim('resources', 'rw');
remoteStorage.access.claim('categories', 'rw');
remoteStorage.access.claim('topics', 'rw');
remoteStorage.access.claim('settings', 'rw');

// Enable caching with 'ALL' strategy (proactively sync everything)
remoteStorage.caching.enable('/resources/');
remoteStorage.caching.enable('/categories/');
remoteStorage.caching.enable('/topics/');
remoteStorage.caching.enable('/settings/');

// ============================================
// Event Handlers & State
// ============================================

// Track online status locally (RS also tracks this via network-offline/online events)
let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { isOnline = true; });
  window.addEventListener('offline', () => { isOnline = false; });
}

// Event handlers for debugging and state tracking
remoteStorage.on('ready', () => {
  if (import.meta.env.DEV) {
    console.log('[RS] Ready');
  }
});

remoteStorage.on('connected', () => {
  if (import.meta.env.DEV) {
    console.log('[RS] Connected:', remoteStorage.remote.userAddress);
  }
});

remoteStorage.on('disconnected', () => {
  if (import.meta.env.DEV) {
    console.log('[RS] Disconnected');
  }
});

remoteStorage.on('not-connected', () => {
  if (import.meta.env.DEV) {
    console.log('[RS] Not connected (anonymous mode)');
  }
});

remoteStorage.on('network-offline', () => {
  isOnline = false;
  if (import.meta.env.DEV) {
    console.log('[RS] Network offline');
  }
});

remoteStorage.on('network-online', () => {
  isOnline = true;
  if (import.meta.env.DEV) {
    console.log('[RS] Network online');
  }
});

remoteStorage.on('sync-done', (result: unknown) => {
  const syncResult = result as { completed?: boolean } | undefined;
  if (import.meta.env.DEV) {
    console.log('[RS] Sync done:', syncResult?.completed ? 'completed' : 'incomplete');
  }
});

remoteStorage.on('error', (error: unknown) => {
  const msg = error instanceof Error ? error.message : String(error);
  // Network/sync errors are expected when offline, don't log them prominently
  if (msg.includes('Sync failed') || msg.includes('Network') || !isOnline) {
    if (import.meta.env.DEV) {
      console.log('[RS] Sync error (will retry):', msg);
    }
  } else {
    console.error('[RS] Error:', error);
  }
});

remoteStorage.on('conflict', (event: unknown) => {
  console.warn('[RS] Conflict:', event);
  // Remote version will be adopted; UI should handle conflicts if needed
});

// ============================================
// Utility Exports
// ============================================

/**
 * Get current connection/sync status
 */
export function getStatus() {
  return {
    online: isOnline,
    connected: remoteStorage.connected,
    userAddress: remoteStorage.remote?.userAddress ?? null,
  };
}

/**
 * Manually trigger sync (for pull-to-refresh, etc.)
 */
export function triggerSync(): Promise<void> {
  if (!remoteStorage.connected || !isOnline) {
    return Promise.resolve();
  }
  return remoteStorage.startSync().catch((err) => {
    if (import.meta.env.DEV) {
      console.log('[RS] Manual sync failed:', err.message);
    }
  });
}

// ============================================
// Type Declarations
// ============================================

export interface ZikraModules {
  resources: ReturnType<typeof resourcesModule.builder>['exports'];
  categories: ReturnType<typeof categoriesModule.builder>['exports'];
  topics: ReturnType<typeof topicsModule.builder>['exports'];
  settings: ReturnType<typeof settingsModule.builder>['exports'];
}

// Type assertion for module access
declare module 'remotestoragejs' {
  interface RemoteStorage {
    resources: ZikraModules['resources'];
    categories: ZikraModules['categories'];
    topics: ZikraModules['topics'];
    settings: ZikraModules['settings'];
  }
}

export default remoteStorage;
