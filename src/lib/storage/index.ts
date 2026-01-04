/**
 * RemoteStorage Configuration and Instance
 * 
 * This file creates and configures the RemoteStorage instance
 * that will be used throughout the app.
 * 
 * OFFLINE-FIRST ARCHITECTURE:
 * - App reads/writes to local cache immediately
 * - Sync happens in background when connected
 * - No blocking on sync - app is always responsive
 */

import RemoteStorage from 'remotestoragejs';
import { resourcesModule } from './modules/resources';
import { categoriesModule } from './modules/categories';
import { topicsModule } from './modules/topics';
import { settingsModule } from './modules/settings';

// Sync interval in milliseconds (5 minutes)
const SYNC_INTERVAL = 5 * 60 * 1000;

// Create RemoteStorage instance with offline-first configuration
export const remoteStorage = new RemoteStorage({
  // Enable local caching - this is the key for offline-first
  cache: true,
  
  // Configure which events we want to receive
  changeEvents: {
    local: true,      // Changes from local operations
    window: true,     // Changes from other browser tabs/windows
    remote: true,     // Changes synced from remote
    conflict: true,   // Conflicts between local and remote
  },
  
  // Enable logging in development
  logging: import.meta.env.DEV,
  
  // Request timeout
  requestTimeout: 30000,
});

// NOTE: We don't call stopSync() here. Instead, we use maxAge=false in all
// read operations (getAll, getObject, getListing) to ensure they always
// return from local cache without hitting the network. This is the proper
// offline-first approach per RemoteStorage.js documentation.
// Sync will happen naturally in the background when online.

// Add modules explicitly after creation
remoteStorage.addModule(resourcesModule);
remoteStorage.addModule(categoriesModule);
remoteStorage.addModule(topicsModule);
remoteStorage.addModule(settingsModule);

// Configure access scopes for all modules
remoteStorage.access.claim('resources', 'rw');
remoteStorage.access.claim('categories', 'rw');
remoteStorage.access.claim('topics', 'rw');
remoteStorage.access.claim('settings', 'rw');

// Enable caching for our modules (FLUSH strategy for offline-first)
// This means data is written to cache immediately and synced later
remoteStorage.caching.enable('/resources/');
remoteStorage.caching.enable('/categories/');
remoteStorage.caching.enable('/topics/');
remoteStorage.caching.enable('/settings/');

// ============================================
// Sync State Management
// ============================================

let syncIntervalId: ReturnType<typeof setInterval> | null = null;
let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

// Track online/offline status
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    isOnline = true;
    // Trigger sync when coming back online
    triggerBackgroundSync();
  });
  
  window.addEventListener('offline', () => {
    isOnline = false;
  });
}

/**
 * Trigger a background sync if connected and online
 * This is non-blocking and won't affect app responsiveness
 */
export function triggerBackgroundSync(): void {
  // Double-check online status using navigator
  const currentlyOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  isOnline = currentlyOnline;
  
  if (!isOnline) {
    if (import.meta.env.DEV) {
      console.log('[Sync] Skipping sync - offline');
    }
    return;
  }
  
  if (!remoteStorage.connected) {
    if (import.meta.env.DEV) {
      console.log('[Sync] Skipping sync - not connected to remote');
    }
    return;
  }
  
  // Trigger sync without blocking - silently handle errors
  remoteStorage.startSync().catch((err) => {
    // Only log in dev, don't show errors to user for background sync
    if (import.meta.env.DEV) {
      console.log('[Sync] Background sync failed (will retry):', err.message);
    }
  });
}

/**
 * Start periodic background sync
 * Call this after the app is initialized
 */
export function startPeriodicSync(): void {
  if (syncIntervalId) {
    return; // Already running
  }
  
  // Do an initial sync
  triggerBackgroundSync();
  
  // Set up periodic sync
  syncIntervalId = setInterval(() => {
    triggerBackgroundSync();
  }, SYNC_INTERVAL);
  
  if (import.meta.env.DEV) {
    console.log(`[Sync] Started periodic sync every ${SYNC_INTERVAL / 1000}s`);
  }
}

/**
 * Stop periodic background sync
 */
export function stopPeriodicSync(): void {
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
    if (import.meta.env.DEV) {
      console.log('[Sync] Stopped periodic sync');
    }
  }
}

/**
 * Get current sync/connection status
 */
export function getSyncStatus(): {
  online: boolean;
  connected: boolean;
  syncing: boolean;
} {
  return {
    online: isOnline,
    connected: remoteStorage.connected,
    syncing: Boolean((remoteStorage as any).sync?._tasks?.length),
  };
}

// Set up sync event handlers
remoteStorage.on('connected', () => {
  if (import.meta.env.DEV) {
    console.log('[Storage] Connected to remote storage');
  }
  // Only start sync if we're online
  if (isOnline) {
    startPeriodicSync();
  }
});

remoteStorage.on('disconnected', () => {
  if (import.meta.env.DEV) {
    console.log('[Storage] Disconnected - stopping sync');
  }
  stopPeriodicSync();
});

remoteStorage.on('sync-done', () => {
  if (import.meta.env.DEV) {
    console.log('[Storage] Sync completed');
  }
});

remoteStorage.on('sync-req-done', () => {
  // Individual sync request completed
});

remoteStorage.on('error', (error: unknown) => {
  // Don't log sync errors when offline - they're expected
  if (!isOnline) {
    if (import.meta.env.DEV) {
      console.log('[Storage] Ignoring error while offline');
    }
    return;
  }
  
  // Log other errors
  const errorMessage = error instanceof Error ? error.message : String(error);
  if (errorMessage.includes('Sync failed') || errorMessage.includes('Network')) {
    // Network errors during sync are expected sometimes, don't alarm the user
    if (import.meta.env.DEV) {
      console.log('[Storage] Sync error (will retry):', errorMessage);
    }
  } else {
    console.error('[Storage] RemoteStorage error:', error);
  }
});

// Handle conflicts by keeping local version (offline-first strategy)
remoteStorage.on('conflict', (event: any) => {
  console.warn('[Storage] Conflict detected, keeping local version:', event);
  // In offline-first, local changes take precedence
  // The user's most recent action wins
});

// Debug: Log that modules are set up
if (import.meta.env.DEV) {
  console.log('RemoteStorage modules registered:', {
    resources: !!remoteStorage.resources,
    categories: !!remoteStorage.categories,
    topics: !!remoteStorage.topics,
    settings: !!remoteStorage.settings,
  });
}

// Export typed module accessors
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
