# RemoteStorage Integration

This document explains how Zikra integrates with RemoteStorage.js for offline-first data persistence.

## Overview

RemoteStorage.js provides:
- **Local persistence** via IndexedDB
- **Remote sync** with remoteStorage-compatible servers
- **Conflict resolution** for concurrent edits
- **Change events** for reactive updates

## Configuration

The main RemoteStorage instance is configured in `src/lib/storage/index.ts`:

```typescript
import RemoteStorage from 'remotestoragejs';

const remoteStorage = new RemoteStorage({
  cache: true,                    // Enable local caching
  changeEvents: {
    local: true,                  // Emit events for local changes
    window: true,                 // Emit events from other tabs
    remote: true,                 // Emit events from remote sync
    conflict: true                // Emit events for conflicts
  },
  logging: import.meta.env.DEV    // Log in development only
});
```

### Configuration Options Explained

| Option | Value | Purpose |
|--------|-------|---------|
| `cache` | `true` | Store data in IndexedDB for offline access |
| `changeEvents.local` | `true` | Notify when this tab writes data |
| `changeEvents.window` | `true` | Notify when another tab writes data |
| `changeEvents.remote` | `true` | Notify when sync brings remote changes |
| `changeEvents.conflict` | `true` | Notify when local/remote conflict occurs |

## Modules

### Module Structure

Each module follows this pattern:

```typescript
import type { RSModule } from 'remotestoragejs';

const myModule: RSModule = {
  name: 'mymodule',  // Access via remoteStorage.mymodule
  builder: function(privateClient, publicClient) {
    // Define data schema (optional but recommended)
    privateClient.declareType('item', {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        createdAt: { type: 'string' }
      },
      required: ['id', 'name']
    });
    
    // Return API methods
    return {
      exports: {
        async add(item) {
          const path = `items/${item.id}`;
          return privateClient.storeObject('item', path, item);
        },
        
        async get(id) {
          // maxAge: false = always read from cache
          return privateClient.getObject(`items/${id}`, false);
        },
        
        async getAll() {
          // maxAge: false = always read from cache
          const listing = await privateClient.getAll('items/', false);
          return Object.values(listing || {});
        },
        
        async remove(id) {
          return privateClient.remove(`items/${id}`);
        }
      }
    };
  }
};
```

### Key Insight: The `maxAge` Parameter

This is the most important concept for offline-first behavior:

```typescript
// ❌ BAD: May try network request, fails offline
await privateClient.getObject('items/123');

// ✅ GOOD: Always reads from local cache
await privateClient.getObject('items/123', false);
```

When `maxAge` is `false`:
- The promise **always** resolves with data from IndexedDB
- No network request is made
- Works completely offline
- Returns `undefined` if data doesn't exist locally

### Zikra's Modules

| Module | Path | Purpose |
|--------|------|---------|
| `resources` | `/resources/` | Saved web resources |
| `categories` | `/categories/` | Resource categories |
| `topics` | `/topics/` | Cross-cutting tags |
| `settings` | `/settings/` | User preferences |

## Access Claims and Caching

After registering modules, you must:

1. **Claim access** - Declare what permissions the module needs:

```typescript
remoteStorage.access.claim('resources', 'rw');  // read-write
remoteStorage.access.claim('categories', 'rw');
remoteStorage.access.claim('topics', 'rw');
remoteStorage.access.claim('settings', 'rw');
```

2. **Enable caching** - Tell RemoteStorage to cache this path:

```typescript
// 'ALL' strategy = proactively sync everything
remoteStorage.caching.enable('/resources/', 'ALL');
remoteStorage.caching.enable('/categories/', 'ALL');
remoteStorage.caching.enable('/topics/', 'ALL');
remoteStorage.caching.enable('/settings/', 'ALL');
```

### Caching Strategies

| Strategy | Behavior |
|----------|----------|
| `'ALL'` | Sync everything in this path proactively |
| `'SEEN'` | Only sync items that have been accessed |
| `'FLUSH'` | Flush cached data when sync completes |

Zikra uses `'ALL'` because we want all data available offline.

## Event Handling

RemoteStorage emits events for various lifecycle states:

```typescript
// Fired once when RS is ready to use
remoteStorage.on('ready', () => {
  console.log('RemoteStorage ready');
});

// User connected to a remote server
remoteStorage.on('connected', () => {
  console.log('Connected to remote');
});

// User disconnected
remoteStorage.on('disconnected', () => {
  console.log('Disconnected from remote');
});

// Network status changes
remoteStorage.on('network-offline', () => {
  console.log('Network offline');
});

remoteStorage.on('network-online', () => {
  console.log('Network online');
});

// Sync completed
remoteStorage.on('sync-done', (result) => {
  console.log('Sync completed:', result);
});

// Errors
remoteStorage.on('error', (error) => {
  console.error('RS error:', error);
});

// Conflicts
remoteStorage.on('conflict', (conflict) => {
  console.log('Conflict:', conflict);
});
```

### Change Events

The most important events for reactive UI are change events on the privateClient:

```typescript
privateClient.on('change', (event) => {
  console.log('Path:', event.relativePath);
  console.log('Old value:', event.oldValue);
  console.log('New value:', event.newValue);
  console.log('Origin:', event.origin);  // 'local', 'remote', 'window', 'conflict'
});
```

## Triggering Sync

Sync happens automatically when:
- User connects to a remote server
- Network comes back online
- Changes are made locally (pushes to remote)

You can also trigger sync manually:

```typescript
import { triggerSync } from '@/lib/storage';

// Force a sync
await triggerSync();
```

## Widget Integration

The RemoteStorage widget provides the connection UI:

```typescript
import Widget from 'remotestorage-widget';

const widget = new Widget(remoteStorage, {
  leaveOpen: false,
  autoCloseAfter: 1500,
  skipInitial: false,
  modalBackdrop: true,
  backdropModal: true,
  backdropClose: true,
  logo: true,
  logging: import.meta.env.DEV
});

// Attach to DOM element
widget.attach('remotestorage-widget-container');
```

## Debugging

Enable logging in development:

```typescript
const remoteStorage = new RemoteStorage({
  logging: true
});
```

Check current status:

```typescript
import { getStatus } from '@/lib/storage';

const status = getStatus();
console.log(status);
// { connected: false, online: true, remote: null }
```

Check if a module is initialized:

```typescript
if (remoteStorage.resources) {
  // Module is ready
  const items = await remoteStorage.resources.getAll();
}
```
