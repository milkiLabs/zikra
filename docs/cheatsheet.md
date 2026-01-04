# Quick Reference / Cheatsheet

## RemoteStorage Quick Reference

### Reading Data (Offline-First)

```typescript
// ✅ Always use maxAge: false for offline-first reads
await privateClient.getObject('path/to/item', false);
await privateClient.getAll('path/', false);
await privateClient.getListing('path/', false);

// ❌ Don't do this - may fail offline
await privateClient.getObject('path/to/item');
```

### Writing Data

```typescript
// Store with type validation
await privateClient.storeObject('typeName', 'path/to/item', data);

// Store without type validation
await privateClient.storeFile('application/json', 'path/to/item', JSON.stringify(data));

// Delete
await privateClient.remove('path/to/item');
```

### Events

```typescript
// RemoteStorage instance events
remoteStorage.on('ready', () => {});
remoteStorage.on('connected', () => {});
remoteStorage.on('disconnected', () => {});
remoteStorage.on('network-offline', () => {});
remoteStorage.on('network-online', () => {});
remoteStorage.on('sync-done', (result) => {});
remoteStorage.on('error', (error) => {});
remoteStorage.on('conflict', (conflict) => {});

// Client change events
privateClient.on('change', (event) => {
  // event.relativePath
  // event.oldValue
  // event.newValue
  // event.origin: 'local' | 'remote' | 'window' | 'conflict'
});
```

### Caching

```typescript
// Enable caching with strategy
remoteStorage.caching.enable('/path/', 'ALL');   // Sync everything
remoteStorage.caching.enable('/path/', 'SEEN');  // Sync accessed items only
remoteStorage.caching.disable('/path/');         // Disable caching
```

### Manual Sync

```typescript
await remoteStorage.sync.forceSync();
```

---

## SolidJS Store Patterns

### Create Store

```typescript
import { createStore, produce } from 'solid-js/store';

interface State {
  items: Record<string, Item>;
  loading: boolean;
}

const [state, setState] = createStore<State>({
  items: {},
  loading: true
});
```

### Update Store

```typescript
// Set entire state
setState({ items: newItems, loading: false });

// Update with produce (for mutations)
setState(produce(s => {
  s.items[id] = newItem;
}));

// Delete from record
setState(produce(s => {
  delete s.items[id];
}));
```

### Derived Signals

```typescript
// Array from record
const items = () => Object.values(state.items);

// Filtered
const favorites = () => items().filter(i => i.favorite);

// Sorted
const recent = () => items().sort((a, b) => 
  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
);
```

---

## File Paths

| Purpose | Path |
|---------|------|
| RemoteStorage instance | `src/lib/storage/index.ts` |
| Resources module | `src/lib/storage/modules/resources.ts` |
| Categories module | `src/lib/storage/modules/categories.ts` |
| Topics module | `src/lib/storage/modules/topics.ts` |
| Settings module | `src/lib/storage/modules/settings.ts` |
| Resources store | `src/lib/stores/resources.ts` |
| Categories store | `src/lib/stores/categories.ts` |
| Topics store | `src/lib/stores/topics.ts` |
| Settings store | `src/lib/stores/settings.ts` |
| Type definitions | `src/lib/types/index.ts` |
| App context | `src/contexts/AppContext.tsx` |

---

## Common Operations

### Add a Resource

```typescript
import { addResource } from '@/lib/stores/resources';

await addResource({
  url: 'https://example.com',
  title: 'Example',
  type: 'link',
  categoryId: 'cat-123',
  topicIds: ['topic-1', 'topic-2']
});
```

### Update a Resource

```typescript
import { updateResource } from '@/lib/stores/resources';

await updateResource('resource-id', {
  title: 'New Title',
  status: 'completed'
});
```

### Delete a Resource

```typescript
import { deleteResource } from '@/lib/stores/resources';

await deleteResource('resource-id');
```

### Get Filtered Resources

```typescript
import { resources, resourcesByCategory, favorites } from '@/lib/stores/resources';

// All resources
const all = resources();

// By category
const inCategory = resourcesByCategory('cat-123');

// Favorites only
const favs = favorites();
```

### Check Sync Status

```typescript
import { getStatus, triggerSync } from '@/lib/storage';

const status = getStatus();
// { connected: boolean, online: boolean }

// Force sync
await triggerSync();
```

---

## Resource Types

| Type | Description |
|------|-------------|
| `link` | Generic web link |
| `article` | Blog post / article |
| `video` | YouTube, Vimeo, etc. |
| `image` | Image file |
| `audio` | Podcast, music |
| `document` | PDF, doc, etc. |
| `code` | Code snippet / repo |
| `social` | Tweet, post, etc. |
| `other` | Everything else |

---

## Status Values

| Status | Meaning |
|--------|---------|
| `unread` | Not yet viewed |
| `reading` | Currently reading/watching |
| `completed` | Finished |
| `archived` | Hidden from main view |

---

## Debugging Commands

```javascript
// Check RemoteStorage status
remoteStorage.remote

// Check cached data
remoteStorage.resources.getAll().then(console.log)

// Force sync
remoteStorage.sync.forceSync()

// Check IndexedDB
indexedDB.databases()

// Check service worker
navigator.serviceWorker.getRegistrations()

// Check cache storage
caches.keys()
```
