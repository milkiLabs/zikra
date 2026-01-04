/**
 * SyncWidget Component
 * 
 * A comprehensive sync/connection widget inspired by remotestorage-widget.
 * Single icon that represents all states:
 * - Not authenticated (gray) - tap to connect
 * - Offline but authenticated (amber) - shows offline status
 * - Connected and synced (green) - fully synced
 * - Connected and syncing (blue with animation) - shows progress
 * 
 * Clicking opens a modal with full sync management.
 */

import { Component, Show, createSignal, createEffect, onMount, onCleanup, createMemo } from 'solid-js';
import { Portal } from 'solid-js/web';
import { remoteStorage, triggerSync, getStatus } from '../../lib/storage';
import { Input, Button } from '../ui';

// ============================================
// Types
// ============================================

type SyncState = 
  | 'not-connected'      // No account connected
  | 'offline'            // Connected but offline
  | 'syncing'            // Currently syncing
  | 'synced'             // Fully synced
  | 'error';             // Error state

interface SyncProgress {
  tasksRemaining: number;
  lastSynced: Date | null;
}

// ============================================
// RemoteStorage Logo SVG
// ============================================

const RemoteStorageLogo: Component<{ 
  class?: string; 
  size?: number;
  color?: string;
}> = (props) => {
  const size = () => props.size || 24;
  return (
    <svg 
      class={props.class}
      width={size()} 
      height={size()} 
      viewBox="0 0 739 853"
      style={{ "shape-rendering": "geometricPrecision" }}
    >
      <polygon 
        fill={props.color || "currentColor"}
        points="370,754 0,542 0,640 185,747 370,853 554,747 739,640 739,525 739,525 739,476 739,427 739,378 653,427 370,589 86,427 86,427 86,361 185,418 370,524 554,418 653,361 739,311 739,213 739,213 554,107 370,0 185,107 58,180 144,230 228,181 370,100 511,181 652,263 370,425 87,263 87,263 0,213 0,213 0,311 0,378 0,427 0,476 86,525 185,582 370,689 554,582 653,525 653,590 653,592"
      />
    </svg>
  );
};

// ============================================
// Sync Status Icon
// ============================================

const StatusIcon: Component<{ state: SyncState; size?: number }> = (props) => {
  const size = () => props.size || 20;
  
  const iconConfig = createMemo(() => {
    switch (props.state) {
      case 'not-connected':
        return { color: '#9CA3AF', animate: false }; // gray-400
      case 'offline':
        return { color: '#F59E0B', animate: false }; // amber-500
      case 'syncing':
        return { color: '#3B82F6', animate: true };  // blue-500
      case 'synced':
        return { color: '#10B981', animate: false }; // green-500
      case 'error':
        return { color: '#EF4444', animate: false }; // red-500
      default:
        return { color: '#9CA3AF', animate: false };
    }
  });

  return (
    <div class={`relative ${iconConfig().animate ? 'animate-pulse' : ''}`}>
      <RemoteStorageLogo 
        size={size()} 
        color={iconConfig().color}
        class={iconConfig().animate ? 'animate-spin-slow' : ''}
      />
      {/* Small indicator dot */}
      <Show when={props.state === 'syncing'}>
        <span class="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full animate-ping" />
      </Show>
      <Show when={props.state === 'offline'}>
        <span class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-white dark:border-gray-900" />
      </Show>
      <Show when={props.state === 'error'}>
        <span class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-900" />
      </Show>
    </div>
  );
};

// ============================================
// Progress Bar
// ============================================

const SyncProgressBar: Component<{ progress: number; show: boolean }> = (props) => (
  <Show when={props.show}>
    <div class="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
      <div 
        class="h-full bg-blue-500 transition-all duration-300 ease-out rounded-full"
        style={{ width: `${Math.max(5, 100 - props.progress)}%` }}
      />
    </div>
  </Show>
);

// ============================================
// Main SyncWidget Component
// ============================================

export const SyncWidget: Component = () => {
  // State
  const [isOpen, setIsOpen] = createSignal(false);
  const [syncState, setSyncState] = createSignal<SyncState>('not-connected');
  const [syncProgress, setSyncProgress] = createSignal<SyncProgress>({
    tasksRemaining: 0,
    lastSynced: null,
  });
  const [userAddress, setUserAddress] = createSignal('');
  const [connecting, setConnecting] = createSignal(false);
  const [connectError, setConnectError] = createSignal<string | null>(null);
  const [online, setOnline] = createSignal(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Computed values
  const connectedUser = createMemo(() => remoteStorage.remote?.userAddress || null);
  const isConnected = createMemo(() => remoteStorage.connected);
  const isSyncing = createMemo(() => syncState() === 'syncing');
  
  const statusLabel = createMemo(() => {
    switch (syncState()) {
      case 'not-connected': return 'Not Connected';
      case 'offline': return 'Offline';
      case 'syncing': return 'Syncing...';
      case 'synced': return 'Synced';
      case 'error': return 'Error';
      default: return 'Unknown';
    }
  });

  const statusDescription = createMemo(() => {
    switch (syncState()) {
      case 'not-connected': 
        return 'Connect to a remoteStorage provider to sync your data across devices.';
      case 'offline': 
        return 'You\'re offline. Changes will sync when you\'re back online.';
      case 'syncing': {
        const remaining = syncProgress().tasksRemaining;
        return remaining > 0 
          ? `Syncing... ${remaining} items remaining` 
          : 'Syncing your data...';
      }
      case 'synced': {
        const last = syncProgress().lastSynced;
        if (last) {
          return `Last synced ${formatTimeAgo(last)}`;
        }
        return 'Your data is synced';
      }
      case 'error':
        return 'There was an error syncing. Please try again.';
      default:
        return '';
    }
  });

  // Update state based on RS events
  const updateState = () => {
    const status = getStatus();
    
    if (!status.connected) {
      setSyncState('not-connected');
    } else if (!status.online) {
      setSyncState('offline');
    } else {
      // Connected and online - check if syncing
      // State will be set to 'syncing' by sync-started event
      // and 'synced' by sync-done event
      if (syncState() !== 'syncing') {
        setSyncState('synced');
      }
    }
  };

  // Event handlers
  onMount(() => {
    // Online/offline listeners
    const handleOnline = () => {
      setOnline(true);
      updateState();
    };
    const handleOffline = () => {
      setOnline(false);
      updateState();
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // RS event handlers
    const onReady = () => updateState();
    const onConnected = () => {
      updateState();
    };
    const onDisconnected = () => {
      setSyncState('not-connected');
      setSyncProgress({ tasksRemaining: 0, lastSynced: null });
    };
    const onNetworkOffline = () => {
      setOnline(false);
      if (isConnected()) {
        setSyncState('offline');
      }
    };
    const onNetworkOnline = () => {
      setOnline(true);
      if (isConnected()) {
        setSyncState('synced');
      }
    };
    const onSyncStarted = () => {
      if (isConnected()) {
        setSyncState('syncing');
      }
    };
    const onSyncReqDone = (result: { tasksRemaining?: number }) => {
      setSyncProgress(prev => ({
        ...prev,
        tasksRemaining: result.tasksRemaining ?? 0,
      }));
    };
    const onSyncDone = (result: { completed?: boolean }) => {
      if (isConnected() && online()) {
        setSyncState('synced');
        if (result.completed) {
          setSyncProgress(prev => ({
            ...prev,
            tasksRemaining: 0,
            lastSynced: new Date(),
          }));
        }
      }
    };
    const onError = (error: unknown) => {
      // Only show error state for significant errors
      if (error && typeof error === 'object' && 'name' in error) {
        const errObj = error as { name: string };
        if (errObj.name === 'Unauthorized') {
          setSyncState('error');
        }
      }
    };

    // Register RS event listeners
    remoteStorage.on('ready', onReady);
    remoteStorage.on('connected', onConnected);
    remoteStorage.on('disconnected', onDisconnected);
    remoteStorage.on('not-connected', () => setSyncState('not-connected'));
    remoteStorage.on('network-offline', onNetworkOffline);
    remoteStorage.on('network-online', onNetworkOnline);
    
    // Sync events - need to check if sync feature exists
    if (remoteStorage.hasFeature && remoteStorage.hasFeature('Sync')) {
      remoteStorage.on('sync-started' as 'ready', onSyncStarted);
      remoteStorage.on('sync-req-done' as 'ready', onSyncReqDone as () => void);
    }
    remoteStorage.on('sync-done', ((result: unknown) => {
      const syncResult = result as { completed?: boolean } | undefined;
      onSyncDone({ completed: syncResult?.completed });
    }) as () => void);
    remoteStorage.on('error', onError as (error: unknown) => void);

    // Initial state
    updateState();

    onCleanup(() => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    });
  });

  // Actions
  const handleConnect = async (e: Event) => {
    e.preventDefault();
    const address = userAddress().trim();
    if (!address) return;

    setConnecting(true);
    setConnectError(null);
    
    try {
      await remoteStorage.connect(address);
      setUserAddress('');
      // Don't close modal - let user see connection status
    } catch (error) {
      console.error('Connection failed:', error);
      setConnectError(error instanceof Error ? error.message : 'Connection failed');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = () => {
    remoteStorage.disconnect();
    setIsOpen(false);
  };

  const handleSyncNow = async () => {
    if (!isConnected() || !online() || isSyncing()) return;
    setSyncState('syncing');
    try {
      await triggerSync();
    } catch {
      // Error handled by RS error event
    }
  };

  // Click outside to close
  const handleBackdropClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsOpen(false);
    }
  };

  // Handle escape key
  createEffect(() => {
    if (!isOpen()) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    
    document.addEventListener('keydown', handleEscape);
    onCleanup(() => document.removeEventListener('keydown', handleEscape));
  });

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        class={`
          relative p-2 rounded-lg transition-all duration-200
          hover:bg-gray-100 dark:hover:bg-gray-800
          focus:outline-none focus:ring-2 focus:ring-blue-500/50
          ${isOpen() ? 'bg-gray-100 dark:bg-gray-800' : ''}
        `}
        title={`${statusLabel()}: ${statusDescription()}`}
        aria-label="Sync status"
      >
        <StatusIcon state={syncState()} size={24} />
      </button>

      {/* Modal */}
      <Show when={isOpen()}>
        <Portal>
          <div 
            class="fixed inset-0 z-50 flex items-start justify-end p-4 bg-black/30 backdrop-blur-sm animate-fade-in"
            onClick={handleBackdropClick}
          >
            <div 
              class="
                w-full max-w-sm mt-16 mr-2
                bg-white dark:bg-gray-800 
                rounded-xl shadow-2xl
                animate-slide-down
                overflow-hidden
              "
              onClick={e => e.stopPropagation()}
            >
              {/* Header with logo and status */}
              <div class="p-4 border-b border-gray-200 dark:border-gray-700">
                <div class="flex items-center gap-3">
                  <div class={`
                    p-2 rounded-lg
                    ${syncState() === 'syncing' ? 'bg-blue-100 dark:bg-blue-900/30' :
                      syncState() === 'synced' ? 'bg-green-100 dark:bg-green-900/30' :
                      syncState() === 'offline' ? 'bg-amber-100 dark:bg-amber-900/30' :
                      syncState() === 'error' ? 'bg-red-100 dark:bg-red-900/30' :
                      'bg-gray-100 dark:bg-gray-700'}
                  `}>
                    <StatusIcon state={syncState()} size={28} />
                  </div>
                  <div class="flex-1">
                    <h3 class="font-semibold text-gray-900 dark:text-gray-100">
                      {statusLabel()}
                    </h3>
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                      {statusDescription()}
                    </p>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                  >
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {/* Progress bar when syncing */}
                <div class="mt-3">
                  <SyncProgressBar 
                    progress={syncProgress().tasksRemaining} 
                    show={isSyncing()} 
                  />
                </div>
              </div>

              {/* Content */}
              <div class="p-4">
                <Show 
                  when={isConnected()}
                  fallback={
                    /* Connect Form */
                    <form onSubmit={handleConnect} class="space-y-4">
                      <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          User Address
                        </label>
                        <Input
                          type="text"
                          placeholder="user@provider.com"
                          value={userAddress()}
                          onInput={(e) => setUserAddress(e.currentTarget.value)}
                          disabled={connecting()}
                          class="w-full"
                        />
                        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Enter your remoteStorage address (e.g., user@5apps.com)
                        </p>
                      </div>
                      
                      <Show when={connectError()}>
                        <div class="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg">
                          {connectError()}
                        </div>
                      </Show>

                      <Button
                        type="submit"
                        disabled={connecting() || !userAddress().trim()}
                        class="w-full"
                      >
                        {connecting() ? (
                          <span class="flex items-center justify-center gap-2">
                            <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Connecting...
                          </span>
                        ) : 'Connect'}
                      </Button>

                      {/* Provider options */}
                      <div class="pt-2 border-t border-gray-200 dark:border-gray-700">
                        <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">
                          Don't have an account? Try these providers:
                        </p>
                        <div class="flex flex-wrap gap-2">
                          <a 
                            href="https://5apps.com/storage" 
                            target="_blank" 
                            rel="noopener"
                            class="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            5apps
                          </a>
                          <a 
                            href="https://remotestorage.io/get/" 
                            target="_blank" 
                            rel="noopener"
                            class="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            More providers →
                          </a>
                        </div>
                      </div>
                    </form>
                  }
                >
                  {/* Connected State */}
                  <div class="space-y-4">
                    {/* Connected user */}
                    <div class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div class="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                        <svg class="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {connectedUser()}
                        </p>
                        <p class="text-xs text-gray-500 dark:text-gray-400">
                          Connected via remoteStorage
                        </p>
                      </div>
                    </div>

                    {/* Network status */}
                    <Show when={!online()}>
                      <div class="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-lg">
                        <svg class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3" />
                        </svg>
                        <span class="text-sm">You're offline. Changes will sync when you reconnect.</span>
                      </div>
                    </Show>

                    {/* Action buttons */}
                    <div class="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={handleSyncNow}
                        disabled={!online() || isSyncing()}
                        class="flex-1"
                      >
                        {isSyncing() ? (
                          <span class="flex items-center justify-center gap-2">
                            <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Syncing...
                          </span>
                        ) : (
                          <span class="flex items-center justify-center gap-2">
                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Sync Now
                          </span>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={handleDisconnect}
                        class="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        Disconnect
                      </Button>
                    </div>

                    {/* Last synced info */}
                    <Show when={syncProgress().lastSynced}>
                      <p class="text-xs text-center text-gray-500 dark:text-gray-400">
                        Last synced: {syncProgress().lastSynced?.toLocaleTimeString()}
                      </p>
                    </Show>
                  </div>
                </Show>
              </div>

              {/* Footer with branding */}
              <div class="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
                <div class="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <RemoteStorageLogo size={14} color="#FF4B03" />
                  <span>Powered by remoteStorage</span>
                  <a 
                    href="https://remotestorage.io" 
                    target="_blank" 
                    rel="noopener"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Learn more
                  </a>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      </Show>
    </>
  );
};

// ============================================
// Helpers
// ============================================

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

export default SyncWidget;
