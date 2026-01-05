/**
 * SolidJS Stores for Zikra
 * 
 * This file provides reactive SolidJS stores that integrate with RemoteStorage.
 * It creates a seamless bridge between RemoteStorage's event-based updates
 * and SolidJS's fine-grained reactivity system.
 */

import { createSignal, createEffect, onCleanup, batch } from 'solid-js';
import { createStore, produce, reconcile } from 'solid-js/store';
import type { Resource, Category, Topic, AppSettings, ResourceFilter } from '../../types';
import { remoteStorage, readyPromise } from '../storage';
import { generateId } from '../utils/id';

// ============================================
// Resources Store
// ============================================

export interface ResourcesState {
  items: Record<string, Resource>;
  loading: boolean;
  error: Error | null;
  initialized: boolean;
}

const initialResourcesState: ResourcesState = {
  items: {},
  loading: false,
  error: null,
  initialized: false,
};

const [resourcesStore, setResourcesStore] = createStore<ResourcesState>(initialResourcesState);

// Initialize resources from storage
export async function initResources(): Promise<void> {
  if (resourcesStore.initialized) return;

  setResourcesStore('loading', true);
  try {
    if (!remoteStorage.resources) {
      console.warn('Resources module not available yet');
      setResourcesStore('initialized', true);
      setResourcesStore('loading', false);
      return;
    }
    const items = await remoteStorage.resources.getAll();
    batch(() => {
      setResourcesStore('items', reconcile(items));
      setResourcesStore('initialized', true);
      setResourcesStore('loading', false);
    });
  } catch (error) {
    console.error('Failed to initialize resources:', error);
    setResourcesStore('error', error as Error);
    setResourcesStore('loading', false);
    setResourcesStore('initialized', true);
  }
}

// Subscribe to storage changes
export function subscribeToResources(): () => void {
  if (!remoteStorage.resources) {
    console.warn('Resources module not available for subscription');
    return () => { };
  }
  const unsubscribe = remoteStorage.resources.onChange((event: any) => {
    if (event.relativePath?.startsWith('resources/')) {
      const id = event.relativePath.replace('resources/', '');
      if (event.newValue) {
        setResourcesStore('items', id, reconcile(event.newValue));
      } else if (event.oldValue && !event.newValue) {
        setResourcesStore(
          produce((state) => {
            delete state.items[id];
          })
        );
      }
    }
  });
  return unsubscribe;
}

// Utility to remove undefined values (JSON doesn't support undefined)
function removeUndefined<T extends object>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined)
  ) as T;
}

// Resource actions
export const resourceActions = {
  async create(input: Partial<Resource>): Promise<Resource> {
    const id = input.id || generateId();
    const now = new Date().toISOString();

    const resource: Resource = removeUndefined({
      id,
      type: input.type || 'webpage',
      title: input.title || 'Untitled',
      description: input.description,
      url: input.url,
      thumbnailUrl: input.thumbnailUrl,
      categoryIds: input.categoryIds || [],
      topicIds: input.topicIds || [],
      tags: input.tags || [],
      notes: input.notes,
      status: input.status || 'active',
      isFavorite: input.isFavorite || false,
      createdAt: now,
      updatedAt: now,
      addedVia: input.addedVia || 'manual',
      metadata: input.metadata || {},
    }) as Resource;

    try {
      if (!remoteStorage.resources) {
        throw new Error('Resources module not initialized');
      }
      const created = await remoteStorage.resources.create(resource);
      setResourcesStore('items', id, created);
      return created;
    } catch (error) {
      console.error('Failed to create resource:', error);
      throw error;
    }
  },

  async update(id: string, updates: Partial<Resource>): Promise<Resource | null> {
    const updated = await remoteStorage.resources.update(id, updates);
    if (updated) {
      setResourcesStore('items', id, reconcile(updated));
    }
    return updated;
  },

  async remove(id: string, hard = false): Promise<boolean> {
    const success = await remoteStorage.resources.remove(id, hard);
    if (success && hard) {
      setResourcesStore(
        produce((state) => {
          delete state.items[id];
        })
      );
    }
    return success;
  },

  async toggleFavorite(id: string): Promise<Resource | null> {
    const updated = await remoteStorage.resources.toggleFavorite(id);
    if (updated) {
      setResourcesStore('items', id, 'isFavorite', updated.isFavorite);
    }
    return updated;
  },

  async archive(id: string): Promise<Resource | null> {
    const updated = await remoteStorage.resources.archive(id);
    if (updated) {
      setResourcesStore('items', id, 'status', 'archived');
    }
    return updated;
  },

  async restore(id: string): Promise<Resource | null> {
    const updated = await remoteStorage.resources.restore(id);
    if (updated) {
      setResourcesStore('items', id, 'status', 'active');
    }
    return updated;
  },

  async addCategory(id: string, categoryId: string): Promise<Resource | null> {
    const updated = await remoteStorage.resources.addCategory(id, categoryId);
    if (updated) {
      setResourcesStore('items', id, 'categoryIds', updated.categoryIds);
    }
    return updated;
  },

  async removeCategory(id: string, categoryId: string): Promise<Resource | null> {
    const updated = await remoteStorage.resources.removeCategory(id, categoryId);
    if (updated) {
      setResourcesStore('items', id, 'categoryIds', updated.categoryIds);
    }
    return updated;
  },

  async addTopic(id: string, topicId: string): Promise<Resource | null> {
    const updated = await remoteStorage.resources.addTopic(id, topicId);
    if (updated) {
      setResourcesStore('items', id, 'topicIds', updated.topicIds);
    }
    return updated;
  },

  async removeTopic(id: string, topicId: string): Promise<Resource | null> {
    const updated = await remoteStorage.resources.removeTopic(id, topicId);
    if (updated) {
      setResourcesStore('items', id, 'topicIds', updated.topicIds);
    }
    return updated;
  },

  async addTag(id: string, tag: string): Promise<Resource | null> {
    const updated = await remoteStorage.resources.addTag(id, tag);
    if (updated) {
      setResourcesStore('items', id, 'tags', updated.tags);
    }
    return updated;
  },

  async removeTag(id: string, tag: string): Promise<Resource | null> {
    const updated = await remoteStorage.resources.removeTag(id, tag);
    if (updated) {
      setResourcesStore('items', id, 'tags', updated.tags);
    }
    return updated;
  },
};

// Derived selectors
export const selectResources = () => resourcesStore;
export const selectResourcesArray = () => Object.values(resourcesStore.items);
export const selectResourceById = (id: string) => resourcesStore.items[id];
export const selectResourcesByType = (type: Resource['type']) =>
  Object.values(resourcesStore.items).filter(r => r.type === type);
export const selectResourcesByCategory = (categoryId: string) =>
  Object.values(resourcesStore.items).filter(r => r.categoryIds.includes(categoryId));
export const selectResourcesByTopic = (topicId: string) =>
  Object.values(resourcesStore.items).filter(r => r.topicIds.includes(topicId));
export const selectFavoriteResources = () =>
  Object.values(resourcesStore.items).filter(r => r.isFavorite);
export const selectActiveResources = () =>
  Object.values(resourcesStore.items).filter(r => r.status === 'active');

// Filter resources
export function filterResources(filter: ResourceFilter): Resource[] {
  let items = Object.values(resourcesStore.items);

  if (filter.types?.length) {
    items = items.filter(r => filter.types!.includes(r.type));
  }
  if (filter.categoryIds?.length) {
    items = items.filter(r => r.categoryIds.some(c => filter.categoryIds!.includes(c)));
  }
  if (filter.topicIds?.length) {
    items = items.filter(r => r.topicIds.some(t => filter.topicIds!.includes(t)));
  }
  if (filter.tags?.length) {
    items = items.filter(r => r.tags.some(t => filter.tags!.includes(t)));
  }
  if (filter.status?.length) {
    items = items.filter(r => filter.status!.includes(r.status));
  }
  if (filter.isFavorite !== undefined) {
    items = items.filter(r => r.isFavorite === filter.isFavorite);
  }
  if (filter.search) {
    const search = filter.search.toLowerCase();
    items = items.filter(r =>
      r.title.toLowerCase().includes(search) ||
      r.description?.toLowerCase().includes(search) ||
      r.tags.some(t => t.toLowerCase().includes(search))
    );
  }
  if (filter.dateRange?.start) {
    items = items.filter(r => r.createdAt >= filter.dateRange!.start!);
  }
  if (filter.dateRange?.end) {
    items = items.filter(r => r.createdAt <= filter.dateRange!.end!);
  }

  // Sort
  const sortBy = filter.sortBy || 'createdAt';
  const sortOrder = filter.sortOrder || 'desc';
  items.sort((a, b) => {
    const aVal = a[sortBy] as string;
    const bVal = b[sortBy] as string;
    const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  return items;
}

// ============================================
// Categories Store
// ============================================

export interface CategoriesState {
  items: Record<string, Category>;
  loading: boolean;
  error: Error | null;
  initialized: boolean;
}

const initialCategoriesState: CategoriesState = {
  items: {},
  loading: false,
  error: null,
  initialized: false,
};

const [categoriesStore, setCategoriesStore] = createStore<CategoriesState>(initialCategoriesState);

export async function initCategories(): Promise<void> {
  if (categoriesStore.initialized) return;

  setCategoriesStore('loading', true);
  try {
    if (!remoteStorage.categories) {
      console.warn('Categories module not available yet');
      setCategoriesStore('initialized', true);
      setCategoriesStore('loading', false);
      return;
    }
    const items = await remoteStorage.categories.getAll();
    batch(() => {
      setCategoriesStore('items', reconcile(items));
      setCategoriesStore('initialized', true);
      setCategoriesStore('loading', false);
    });
  } catch (error) {
    console.error('Failed to initialize categories:', error);
    setCategoriesStore('error', error as Error);
    setCategoriesStore('loading', false);
    setCategoriesStore('initialized', true);
  }
}

export function subscribeToCategories(): () => void {
  if (!remoteStorage.categories) {
    console.warn('Categories module not available for subscription');
    return () => { };
  }
  const unsubscribe = remoteStorage.categories.onChange((event: any) => {
    if (event.relativePath?.startsWith('categories/')) {
      const id = event.relativePath.replace('categories/', '');
      if (event.newValue) {
        setCategoriesStore('items', id, reconcile(event.newValue));
      } else if (event.oldValue && !event.newValue) {
        setCategoriesStore(
          produce((state) => {
            delete state.items[id];
          })
        );
      }
    }
  });
  return unsubscribe;
}

export const categoryActions = {
  async create(input: Omit<Category, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Category> {
    const id = input.id || generateId();
    const category = {
      ...input,
      id,
      order: input.order ?? Object.keys(categoriesStore.items).length,
    };
    const created = await remoteStorage.categories.create(category);
    setCategoriesStore('items', id, created);
    return created;
  },

  async update(id: string, updates: Partial<Category>): Promise<Category | null> {
    const updated = await remoteStorage.categories.update(id, updates);
    if (updated) {
      setCategoriesStore('items', id, reconcile(updated));
    }
    return updated;
  },

  async remove(id: string): Promise<boolean> {
    const success = await remoteStorage.categories.remove(id);
    if (success) {
      setCategoriesStore(
        produce((state) => {
          delete state.items[id];
        })
      );
    }
    return success;
  },

  async reorder(ids: string[]): Promise<void> {
    await remoteStorage.categories.reorder(ids);
    ids.forEach((id, index) => {
      setCategoriesStore('items', id, 'order', index);
    });
  },
};

export const selectCategories = () => categoriesStore;
export const selectCategoriesArray = () =>
  Object.values(categoriesStore.items).sort((a, b) => a.order - b.order);
export const selectCategoryById = (id: string) => categoriesStore.items[id];
export const selectRootCategories = () =>
  Object.values(categoriesStore.items).filter(c => !c.parentId).sort((a, b) => a.order - b.order);
export const selectChildCategories = (parentId: string) =>
  Object.values(categoriesStore.items).filter(c => c.parentId === parentId).sort((a, b) => a.order - b.order);

// ============================================
// Topics Store
// ============================================

export interface TopicsState {
  items: Record<string, Topic>;
  loading: boolean;
  error: Error | null;
  initialized: boolean;
}

const initialTopicsState: TopicsState = {
  items: {},
  loading: false,
  error: null,
  initialized: false,
};

const [topicsStore, setTopicsStore] = createStore<TopicsState>(initialTopicsState);

export async function initTopics(): Promise<void> {
  if (topicsStore.initialized) return;

  setTopicsStore('loading', true);
  try {
    if (!remoteStorage.topics) {
      console.warn('Topics module not available yet');
      setTopicsStore('initialized', true);
      setTopicsStore('loading', false);
      return;
    }
    const items = await remoteStorage.topics.getAll();
    batch(() => {
      setTopicsStore('items', reconcile(items));
      setTopicsStore('initialized', true);
      setTopicsStore('loading', false);
    });
  } catch (error) {
    console.error('Failed to initialize topics:', error);
    setTopicsStore('error', error as Error);
    setTopicsStore('loading', false);
    setTopicsStore('initialized', true);
  }
}

export function subscribeToTopics(): () => void {
  if (!remoteStorage.topics) {
    console.warn('Topics module not available for subscription');
    return () => { };
  }
  const unsubscribe = remoteStorage.topics.onChange((event: any) => {
    if (event.relativePath?.startsWith('topics/')) {
      const id = event.relativePath.replace('topics/', '');
      if (event.newValue) {
        setTopicsStore('items', id, reconcile(event.newValue));
      } else if (event.oldValue && !event.newValue) {
        setTopicsStore(
          produce((state) => {
            delete state.items[id];
          })
        );
      }
    }
  });
  return unsubscribe;
}

export const topicActions = {
  async create(input: Omit<Topic, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Topic> {
    const id = input.id || generateId();
    const topic = {
      ...input,
      id,
      order: input.order ?? Object.keys(topicsStore.items).length,
    };
    const created = await remoteStorage.topics.create(topic);
    setTopicsStore('items', id, created);
    return created;
  },

  async update(id: string, updates: Partial<Topic>): Promise<Topic | null> {
    const updated = await remoteStorage.topics.update(id, updates);
    if (updated) {
      setTopicsStore('items', id, reconcile(updated));
    }
    return updated;
  },

  async remove(id: string): Promise<boolean> {
    const success = await remoteStorage.topics.remove(id);
    if (success) {
      setTopicsStore(
        produce((state) => {
          delete state.items[id];
        })
      );
    }
    return success;
  },

  async addCategory(id: string, categoryId: string): Promise<Topic | null> {
    const updated = await remoteStorage.topics.addCategory(id, categoryId);
    if (updated) {
      setTopicsStore('items', id, 'categoryIds', updated.categoryIds);
    }
    return updated;
  },

  async removeCategory(id: string, categoryId: string): Promise<Topic | null> {
    const updated = await remoteStorage.topics.removeCategory(id, categoryId);
    if (updated) {
      setTopicsStore('items', id, 'categoryIds', updated.categoryIds);
    }
    return updated;
  },

  async reorder(ids: string[]): Promise<void> {
    await remoteStorage.topics.reorder(ids);
    ids.forEach((id, index) => {
      setTopicsStore('items', id, 'order', index);
    });
  },
};

export const selectTopics = () => topicsStore;
export const selectTopicsArray = () =>
  Object.values(topicsStore.items).sort((a, b) => a.order - b.order);
export const selectTopicById = (id: string) => topicsStore.items[id];
export const selectTopicsByCategory = (categoryId: string) =>
  Object.values(topicsStore.items).filter(t => t.categoryIds.includes(categoryId)).sort((a, b) => a.order - b.order);

// ============================================
// Settings Store
// ============================================

const defaultSettings: AppSettings = {
  theme: 'system',
  defaultView: 'grid',
  autoFetch: true,
  syncInterval: 30000,
  notifications: true,
  language: 'en',
};

const [settingsStore, setSettingsStore] = createStore<AppSettings & { initialized: boolean }>({
  ...defaultSettings,
  initialized: false,
});

export async function initSettings(): Promise<void> {
  if (settingsStore.initialized) return;

  try {
    if (!remoteStorage.settings) {
      console.warn('Settings module not available yet');
      setSettingsStore('initialized', true);
      return;
    }
    const settings = await remoteStorage.settings.get();
    batch(() => {
      setSettingsStore(reconcile({ ...defaultSettings, ...settings, initialized: true }));
    });
  } catch (error) {
    console.error('Failed to load settings:', error);
    setSettingsStore('initialized', true);
  }
}

export function subscribeToSettings(): () => void {
  if (!remoteStorage.settings) {
    console.warn('Settings module not available for subscription');
    return () => { };
  }
  const unsubscribe = remoteStorage.settings.onChange((event: any) => {
    if (event.relativePath === 'settings/app' && event.newValue) {
      setSettingsStore(reconcile({ ...event.newValue, initialized: true }));
    }
  });
  return unsubscribe;
}

export const settingsActions = {
  async update(updates: Partial<AppSettings>): Promise<AppSettings> {
    const updated = await remoteStorage.settings.update(updates);
    setSettingsStore(reconcile({ ...updated, initialized: true }));
    return updated;
  },

  async reset(): Promise<AppSettings> {
    const defaults = await remoteStorage.settings.reset();
    setSettingsStore(reconcile({ ...defaults, initialized: true }));
    return defaults;
  },
};

export const selectSettings = () => settingsStore;

// ============================================
// Connection State
// ============================================

export interface ConnectionState {
  connected: boolean;
  syncing: boolean;
  online: boolean;
  userAddress: string | null;
  backend: string | null;
}

const [connectionState, setConnectionState] = createSignal<ConnectionState>({
  connected: false,
  syncing: false,
  online: navigator.onLine,
  userAddress: null,
  backend: null,
});

export function initConnectionState(): () => void {
  const handlers = {
    connected: () => {
      setConnectionState((s) => ({
        ...s,
        connected: true,
        userAddress: remoteStorage.remote?.userAddress || null,
        backend: remoteStorage.backend || null,
      }));
    },
    disconnected: () => {
      setConnectionState((s) => ({
        ...s,
        connected: false,
        userAddress: null,
        backend: null,
      }));
    },
    'sync-started': () => {
      setConnectionState((s) => ({ ...s, syncing: true }));
    },
    'sync-done': () => {
      setConnectionState((s) => ({ ...s, syncing: false }));
    },
    'network-online': () => {
      setConnectionState((s) => ({ ...s, online: true }));
    },
    'network-offline': () => {
      setConnectionState((s) => ({ ...s, online: false }));
    },
  };

  Object.entries(handlers).forEach(([event, handler]) => {
    remoteStorage.on(event as any, handler);
  });

  // Handle browser online/offline
  const onOnline = () => setConnectionState((s) => ({ ...s, online: true }));
  const onOffline = () => setConnectionState((s) => ({ ...s, online: false }));
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  return () => {
    Object.entries(handlers).forEach(([event, handler]) => {
      remoteStorage.removeEventListener(event, handler);
    });
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}

export { connectionState };

// ============================================
// Initialize All Stores
// ============================================

export async function initAllStores(): Promise<void> {
  const cleanup = initConnectionState();

  // OFFLINE-FIRST: Don't wait for connection, just load from local cache
  // The 'ready' event means remoteStorage has finished initializing its local cache
  // We don't need to be connected to start using the app
  await readyPromise;

  // Initialize all stores from local cache in parallel
  // This reads from IndexedDB, not network
  await Promise.all([
    initResources(),
    initCategories(),
    initTopics(),
    initSettings(),
  ]);

  // Subscribe to changes (both local and remote)
  const unsubscribes = [
    subscribeToResources(),
    subscribeToCategories(),
    subscribeToTopics(),
    subscribeToSettings(),
  ];

  // App is now ready to use, even if offline
  if (import.meta.env.DEV) {
    console.log('[Stores] All stores initialized from local cache');
  }
}

// Export stores
export {
  resourcesStore,
  categoriesStore,
  topicsStore,
  settingsStore,
};
