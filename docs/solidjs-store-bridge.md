# SolidJS Store Bridge

This document explains how Zikra bridges RemoteStorage modules with SolidJS's reactive state management.

## The Challenge

RemoteStorage handles data persistence, but SolidJS components need reactive signals. We need to:

1. Load initial data from RemoteStorage into SolidJS stores
2. Update stores when RemoteStorage emits change events
3. Provide actions that write through to RemoteStorage
4. Handle loading and error states

## Store Structure

Each store follows this pattern:

```typescript
import { createStore, produce } from 'solid-js/store';
import { createSignal, onCleanup, onMount } from 'solid-js';
import { remoteStorage } from '@/lib/storage';

interface ResourceStore {
  items: Record<string, Resource>;
  loading: boolean;
  error: string | null;
}

// Reactive store
const [state, setState] = createStore<ResourceStore>({
  items: {},
  loading: true,
  error: null
});

// Derived signal for array format
const resources = () => Object.values(state.items);

// Actions
async function addResource(data: Partial<Resource>): Promise<Resource> {
  const resource: Resource = {
    id: generateId(),
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  await remoteStorage.resources.add(resource);
  return resource;
}
```

## Initialization Flow

```typescript
async function initResourceStore(): Promise<void> {
  // 1. Wait for RemoteStorage ready event
  await new Promise<void>((resolve) => {
    if (remoteStorage.remote?.connected !== undefined) {
      resolve();
    } else {
      remoteStorage.on('ready', () => resolve());
    }
  });
  
  // 2. Load initial data from cache
  try {
    const items = await remoteStorage.resources.getAll();
    
    // Convert array to record for O(1) lookups
    const itemsMap: Record<string, Resource> = {};
    for (const item of items) {
      if (item.id) {
        itemsMap[item.id] = item;
      }
    }
    
    setState({
      items: itemsMap,
      loading: false,
      error: null
    });
  } catch (error) {
    setState({
      loading: false,
      error: error instanceof Error ? error.message : 'Failed to load'
    });
  }
  
  // 3. Subscribe to change events
  remoteStorage.resources.privateClient.on('change', handleChange);
}
```

## Handling Change Events

When RemoteStorage emits a change event, we update the store:

```typescript
function handleChange(event: ChangeEvent): void {
  const { relativePath, newValue, oldValue, origin } = event;
  
  // Skip directory changes
  if (relativePath.endsWith('/')) return;
  
  // Extract item ID from path (e.g., "resources/abc123" → "abc123")
  const id = relativePath.split('/').pop()?.replace(/\.json$/, '');
  if (!id) return;
  
  if (newValue && !oldValue) {
    // Item added
    setState(produce(s => {
      s.items[id] = newValue as Resource;
    }));
  } else if (newValue && oldValue) {
    // Item updated
    setState(produce(s => {
      s.items[id] = newValue as Resource;
    }));
  } else if (!newValue && oldValue) {
    // Item deleted
    setState(produce(s => {
      delete s.items[id];
    }));
  }
}
```

### Event Origins

The `origin` property tells you where the change came from:

| Origin | Meaning |
|--------|---------|
| `'local'` | This tab wrote the data |
| `'window'` | Another tab wrote the data |
| `'remote'` | Sync brought data from server |
| `'conflict'` | A conflict was resolved |

You might use this for UI feedback:

```typescript
if (origin === 'remote') {
  showNotification('New data synced from server');
}
```

## The `removeUndefined` Utility

RemoteStorage's IndexedDB backend has issues with `undefined` values. Before storing objects, we strip undefined properties:

```typescript
function removeUndefined<T extends object>(obj: T): T {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    const value = obj[key as keyof T];
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result as T;
}

// Usage in store action
async function addResource(data: Partial<Resource>): Promise<Resource> {
  const resource = removeUndefined({
    id: generateId(),
    ...data,
    createdAt: new Date().toISOString()
  });
  
  await remoteStorage.resources.add(resource);
  return resource;
}
```

## Complete Store Example

Here's a complete example of the resources store:

```typescript
// src/lib/stores/resources.ts
import { createStore, produce, reconcile } from 'solid-js/store';
import { remoteStorage, ZikraModules } from '@/lib/storage';
import type { Resource } from '@/lib/types';

// Types
interface ResourceState {
  items: Record<string, Resource>;
  loading: boolean;
  error: string | null;
  initialized: boolean;
}

// Store
const [state, setState] = createStore<ResourceState>({
  items: {},
  loading: true,
  error: null,
  initialized: false
});

// Derived values
export const resources = () => Object.values(state.items);
export const resourcesLoading = () => state.loading;
export const resourcesError = () => state.error;

export const getResource = (id: string) => state.items[id];

export const resourcesByCategory = (categoryId: string) => 
  resources().filter(r => r.categoryId === categoryId);

export const resourcesByTopic = (topicId: string) =>
  resources().filter(r => r.topicIds?.includes(topicId));

// Private helpers
function removeUndefined<T extends object>(obj: T): T {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    const value = obj[key as keyof T];
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result as T;
}

// Actions
export async function addResource(data: Partial<Resource>): Promise<Resource> {
  const resource = removeUndefined<Resource>({
    id: crypto.randomUUID(),
    url: data.url || '',
    title: data.title || 'Untitled',
    description: data.description,
    type: data.type || 'link',
    categoryId: data.categoryId,
    topicIds: data.topicIds || [],
    tags: data.tags || [],
    notes: data.notes,
    thumbnail: data.thumbnail,
    favicon: data.favicon,
    metadata: data.metadata,
    status: data.status || 'unread',
    isFavorite: data.isFavorite || false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  
  await remoteStorage.resources.add(resource);
  return resource;
}

export async function updateResource(
  id: string, 
  updates: Partial<Resource>
): Promise<void> {
  const existing = state.items[id];
  if (!existing) throw new Error(`Resource ${id} not found`);
  
  const updated = removeUndefined({
    ...existing,
    ...updates,
    id, // Preserve ID
    updatedAt: new Date().toISOString()
  });
  
  await remoteStorage.resources.update(id, updated);
}

export async function deleteResource(id: string): Promise<void> {
  await remoteStorage.resources.remove(id);
}

export async function toggleFavorite(id: string): Promise<void> {
  const existing = state.items[id];
  if (!existing) return;
  
  await updateResource(id, { isFavorite: !existing.isFavorite });
}

// Initialization
export async function initResourceStore(): Promise<void> {
  if (state.initialized) return;
  
  try {
    const items = await remoteStorage.resources.getAll();
    
    const itemsMap: Record<string, Resource> = {};
    for (const item of items) {
      if (item?.id) {
        itemsMap[item.id] = item;
      }
    }
    
    setState({
      items: itemsMap,
      loading: false,
      error: null,
      initialized: true
    });
    
    // Subscribe to changes
    remoteStorage.resources.privateClient.on('change', (event) => {
      const { relativePath, newValue, oldValue } = event;
      
      if (relativePath.endsWith('/')) return;
      
      const id = relativePath.split('/').pop()?.replace(/\.json$/, '');
      if (!id) return;
      
      if (newValue) {
        setState(produce(s => {
          s.items[id] = newValue as Resource;
        }));
      } else if (oldValue && !newValue) {
        setState(produce(s => {
          delete s.items[id];
        }));
      }
    });
    
  } catch (error) {
    setState({
      loading: false,
      error: error instanceof Error ? error.message : 'Failed to load resources',
      initialized: true
    });
  }
}
```

## Using Stores in Components

```tsx
import { For, Show, createEffect } from 'solid-js';
import { 
  resources, 
  resourcesLoading, 
  addResource,
  toggleFavorite 
} from '@/lib/stores/resources';

function ResourceList() {
  return (
    <Show 
      when={!resourcesLoading()} 
      fallback={<div>Loading...</div>}
    >
      <For each={resources()}>
        {(resource) => (
          <div class="p-4 border rounded">
            <h3>{resource.title}</h3>
            <a href={resource.url}>{resource.url}</a>
            <button 
              onClick={() => toggleFavorite(resource.id)}
              class={resource.isFavorite ? 'text-yellow-500' : ''}
            >
              ★
            </button>
          </div>
        )}
      </For>
    </Show>
  );
}

async function handleAddResource() {
  await addResource({
    url: 'https://example.com',
    title: 'Example Site',
    type: 'link'
  });
  // Store updates automatically via change event
}
```

## Reactive Queries

Since stores are reactive, you can create derived queries:

```typescript
// In store file
export const unreadResources = () => 
  resources().filter(r => r.status === 'unread');

export const favoriteResources = () =>
  resources().filter(r => r.isFavorite);

export const recentResources = (limit = 10) =>
  resources()
    .sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, limit);

export const resourceCount = () => resources().length;

export const resourcesByStatus = () => {
  const all = resources();
  return {
    unread: all.filter(r => r.status === 'unread').length,
    reading: all.filter(r => r.status === 'reading').length,
    completed: all.filter(r => r.status === 'completed').length,
    archived: all.filter(r => r.status === 'archived').length
  };
};
```

These will automatically update when the underlying data changes!
