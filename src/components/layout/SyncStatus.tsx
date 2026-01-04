/**
 * Sync Status Indicator
 * 
 * Shows the current sync/connection status with visual indicators.
 * Displays different states: offline, syncing, connected, disconnected
 */

import { Component, Show, createMemo } from 'solid-js';
import { useApp } from '../../contexts/AppContext';

interface SyncStatusProps {
  compact?: boolean;
}

export const SyncStatus: Component<SyncStatusProps> = (props) => {
  const app = useApp();

  const status = createMemo(() => {
    if (!app.online) {
      return {
        type: 'offline' as const,
        label: 'Offline',
        description: 'Working offline. Changes will sync when you\'re back online.',
        color: 'text-amber-500',
        bgColor: 'bg-amber-500/10',
        icon: (
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3" />
          </svg>
        ),
      };
    }

    if (app.syncing) {
      return {
        type: 'syncing' as const,
        label: 'Syncing',
        description: 'Syncing your data...',
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        icon: (
          <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        ),
      };
    }

    if (app.connected) {
      return {
        type: 'connected' as const,
        label: 'Connected',
        description: `Synced with ${app.userAddress || 'remote storage'}`,
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
        icon: (
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M5 13l4 4L19 7" />
          </svg>
        ),
      };
    }

    return {
      type: 'local' as const,
      label: 'Local Only',
      description: 'Data is stored locally. Connect to sync across devices.',
      color: 'text-gray-500',
      bgColor: 'bg-gray-500/10',
      icon: (
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    };
  });

  const handleSyncClick = () => {
    if (app.online && app.connected && !app.syncing) {
      app.syncNow();
    }
  };

  // Compact mode - just an icon with tooltip
  if (props.compact) {
    return (
      <button
        onClick={handleSyncClick}
        disabled={!app.online || !app.connected || app.syncing}
        class={`
          p-2 rounded-lg transition-colors
          ${status().bgColor} ${status().color}
          hover:opacity-80 disabled:opacity-50 disabled:cursor-default
        `}
        title={`${status().label}: ${status().description}`}
      >
        {status().icon}
      </button>
    );
  }

  // Full mode with label
  return (
    <div class={`flex items-center gap-2 px-3 py-2 rounded-lg ${status().bgColor}`}>
      <span class={status().color}>
        {status().icon}
      </span>
      <div class="flex flex-col">
        <span class={`text-sm font-medium ${status().color}`}>
          {status().label}
        </span>
        <Show when={status().type !== 'connected'}>
          <span class="text-xs text-gray-500 dark:text-gray-400">
            {status().description}
          </span>
        </Show>
      </div>
      <Show when={app.online && app.connected && !app.syncing}>
        <button
          onClick={handleSyncClick}
          class="ml-2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          title="Sync now"
        >
          <svg class="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </Show>
    </div>
  );
};

export default SyncStatus;
