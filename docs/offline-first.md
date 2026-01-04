# Offline-First Design

Zikra is designed to work completely offline. This document explains the patterns and decisions that make this possible.

## Core Principles

### 1. Local-First Reads

**Every read operation uses `maxAge: false`** to guarantee data comes from local cache:

```typescript
// All module read operations use maxAge: false
async getAll(): Promise<Resource[]> {
  const items = await privateClient.getAll('resources/', false);
  return Object.values(items || {});
}

async get(id: string): Promise<Resource | undefined> {
  return privateClient.getObject(`resources/${id}`, false);
}
```

Without `maxAge: false`, RemoteStorage might try to fetch fresh data from the server, which fails offline.

### 2. Local-First Writes

Writes go to IndexedDB first, then sync in background:

```typescript
async add(resource: Resource): Promise<void> {
  // Writes immediately to IndexedDB
  await privateClient.storeObject('resource', `resources/${resource.id}`, resource);
  // Sync happens automatically when online
}
```

### 3. Proactive Caching

We use the `'ALL'` caching strategy to sync everything:

```typescript
remoteStorage.caching.enable('/resources/', 'ALL');
```

This means when the app goes online:
1. It syncs ALL data proactively
2. Not just items the user has viewed
3. So everything is available when offline again

### 4. Background Sync

Sync is automatic and non-blocking:

```typescript
// RemoteStorage handles sync automatically when:
// - User connects to a remote server
// - Network comes back online  
// - Local changes are made (pushes to remote)

// We listen for completion:
remoteStorage.on('sync-done', (result) => {
  console.log('Background sync completed');
});
```

## Startup Sequence

When the app loads:

```
1. Load HTML/JS/CSS from Service Worker cache
                    ↓
2. Initialize RemoteStorage
                    ↓
3. Read data from IndexedDB (maxAge: false)
                    ↓
4. Render UI with cached data
                    ↓
5. (If online) Sync with remote in background
                    ↓
6. Update UI via change events if new data
```

The user sees their data immediately, even offline!

## Network Status Handling

We track network status for UI feedback:

```typescript
// In storage/index.ts
remoteStorage.on('network-offline', () => {
  console.log('Network went offline');
  // Could show offline indicator
});

remoteStorage.on('network-online', () => {
  console.log('Network came online');
  // Could show syncing indicator
});

// Check current status
export function getStatus() {
  return {
    connected: remoteStorage.remote?.connected ?? false,
    online: remoteStorage.remote?.online ?? navigator.onLine
  };
}
```

## Conflict Resolution

When offline edits conflict with remote changes:

```typescript
remoteStorage.on('conflict', (conflict) => {
  // conflict contains:
  // - path: where the conflict occurred
  // - localAction: what we tried to do locally
  // - remoteAction: what happened remotely
  // - localValue: our local version
  // - remoteValue: the remote version
  
  // Default behavior: remote wins
  // You can implement custom resolution
});
```

### Conflict Scenarios

| Local Action | Remote Action | Default Resolution |
|--------------|---------------|-------------------|
| Update | Update | Remote wins |
| Delete | Update | Remote wins (item restored) |
| Update | Delete | Remote wins (item deleted) |
| Delete | Delete | No conflict |

### Custom Conflict Resolution

You can implement custom logic:

```typescript
remoteStorage.on('conflict', (conflict) => {
  if (conflict.path.startsWith('/resources/')) {
    // For resources, prefer the most recently updated
    const local = conflict.localValue as Resource;
    const remote = conflict.remoteValue as Resource;
    
    if (local && remote) {
      const localTime = new Date(local.updatedAt).getTime();
      const remoteTime = new Date(remote.updatedAt).getTime();
      
      if (localTime > remoteTime) {
        // Local is newer, push it
        conflict.resolve(local);
      } else {
        // Remote is newer, accept it
        conflict.resolve(remote);
      }
    }
  }
});
```

## Data Persistence

### IndexedDB Structure

RemoteStorage uses IndexedDB with this structure:

```
Database: remotestorage
├── Store: nodes
│   ├── Key: /resources/abc123
│   │   Value: { body: {...}, contentType: 'application/json', ... }
│   ├── Key: /resources/def456
│   │   Value: { body: {...}, contentType: 'application/json', ... }
│   └── ...
└── Store: changes
    └── (pending changes for sync)
```

### Persistence Guarantees

- **Durability**: IndexedDB is persistent storage
- **Quota**: Typically 50MB+, varies by browser
- **Eviction**: Browser may evict under storage pressure
- **PWA Persistence**: Service Worker helps prevent eviction

## PWA Integration

The app is a PWA with these offline capabilities:

### Service Worker (via vite-plugin-pwa)

```typescript
// vite.config.ts
VitePWA({
  registerType: 'autoUpdate',
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
    runtimeCaching: [
      // Cache API responses
      {
        urlPattern: /^https:\/\/api\./,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api-cache',
          expiration: { maxEntries: 50 }
        }
      }
    ]
  }
})
```

### What's Cached

| Asset Type | Strategy |
|------------|----------|
| HTML, JS, CSS | Precached (always available) |
| App icons, fonts | Precached |
| User data | IndexedDB via RemoteStorage |
| External images | Runtime cache (if configured) |

## Testing Offline

### Chrome DevTools

1. Open DevTools → Network tab
2. Check "Offline" checkbox
3. Refresh the page
4. App should load with cached data

### Testing Flow

1. Open app while online
2. Add some resources
3. Go offline (airplane mode or DevTools)
4. Refresh page - should still show resources
5. Add more resources - should work
6. Go back online - should sync automatically

## Debugging Offline Issues

### Check IndexedDB

```javascript
// In browser console
indexedDB.open('remotestorage').onsuccess = function(e) {
  const db = e.target.result;
  const tx = db.transaction('nodes', 'readonly');
  const store = tx.objectStore('nodes');
  
  store.getAll().onsuccess = function(e) {
    console.log('Cached data:', e.target.result);
  };
};
```

### Check Service Worker

```javascript
// In browser console
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log('Service workers:', regs);
});

caches.keys().then(keys => {
  console.log('Cache storage:', keys);
});
```

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "Loading..." forever offline | Missing `maxAge: false` | Add to all read operations |
| Data not persisting | IndexedDB blocked | Check browser settings |
| Stale data | Sync not running | Check network, trigger manual sync |
| 404 on refresh | SPA routing issue | Configure server/SW for SPA |

## Best Practices

1. **Always use `maxAge: false` for reads** - This is the #1 offline-first requirement

2. **Initialize stores early** - Load from cache before showing UI

3. **Show loading states briefly** - Cache reads are fast but not instant

4. **Handle errors gracefully** - Network errors shouldn't crash the app

5. **Provide sync status feedback** - Users should know when they're offline

6. **Test offline regularly** - Don't assume it works, verify!
