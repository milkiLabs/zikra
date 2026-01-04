/**
 * Resources RemoteStorage Module
 * 
 * Handles storage of all resources (YouTube, books, papers, articles, etc.)
 */

import type { RSModule } from 'remotestoragejs';
import type { Resource, ResourceType, ResourceStatus } from '../../../types';

// JSON Schema for base resource
const resourceSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    type: { type: 'string' },
    title: { type: 'string' },
    description: { type: 'string' },
    url: { type: 'string' },
    thumbnailUrl: { type: 'string' },
    categoryIds: { type: 'array', items: { type: 'string' }, default: [] },
    topicIds: { type: 'array', items: { type: 'string' }, default: [] },
    tags: { type: 'array', items: { type: 'string' }, default: [] },
    notes: { type: 'string' },
    status: { type: 'string', enum: ['pending', 'active', 'archived', 'deleted'] },
    isFavorite: { type: 'boolean', default: false },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
    addedVia: { type: 'string', enum: ['manual', 'auto', 'extension', 'share-target'] },
    metadata: { type: 'object' },
  },
  required: ['id', 'type', 'title', 'status', 'createdAt', 'updatedAt'],
};

export const resourcesModule: RSModule = {
  name: 'resources',
  builder: (privateClient, publicClient) => {
    // Declare the resource type
    privateClient.declareType('resource', resourceSchema);

    // Helper to generate path from ID
    const getResourcePath = (id: string): string => `resources/${id}`;

    // Get all resources (offline-first: maxAge=false means always use local cache)
    const getAll = async (): Promise<Record<string, Resource>> => {
      // maxAge: false = always return from local cache, never hit network
      const listing = await privateClient.getAll('resources/', false);
      return (listing as Record<string, Resource>) || {};
    };

    // Get resource by ID
    const get = async (id: string): Promise<Resource | null> => {
      try {
        // maxAge: false = always return from local cache
        const resource = await privateClient.getObject(getResourcePath(id), false);
        return resource as Resource | null;
      } catch {
        return null;
      }
    };

    // Get resources by type
    const getByType = async (type: ResourceType): Promise<Resource[]> => {
      const all = await getAll();
      return Object.values(all).filter((r) => r.type === type);
    };

    // Get resources by category
    const getByCategory = async (categoryId: string): Promise<Resource[]> => {
      const all = await getAll();
      return Object.values(all).filter((r) => r.categoryIds.includes(categoryId));
    };

    // Get resources by topic
    const getByTopic = async (topicId: string): Promise<Resource[]> => {
      const all = await getAll();
      return Object.values(all).filter((r) => r.topicIds.includes(topicId));
    };

    // Get resources by status
    const getByStatus = async (status: ResourceStatus): Promise<Resource[]> => {
      const all = await getAll();
      return Object.values(all).filter((r) => r.status === status);
    };

    // Get favorite resources
    const getFavorites = async (): Promise<Resource[]> => {
      const all = await getAll();
      return Object.values(all).filter((r) => r.isFavorite);
    };

    // Create resource
    const create = async (resource: Resource): Promise<Resource> => {
      const now = new Date().toISOString();
      const newResource: Resource = {
        ...resource,
        createdAt: now,
        updatedAt: now,
      };
      await privateClient.storeObject('resource', getResourcePath(resource.id), newResource);
      return newResource;
    };

    // Update resource
    const update = async (id: string, updates: Partial<Resource>): Promise<Resource | null> => {
      const existing = await get(id);
      if (!existing) return null;

      // Use type assertion since we're merging same-type resources
      const updated = {
        ...existing,
        ...updates,
        id, // Ensure ID doesn't change
        updatedAt: new Date().toISOString(),
      } as Resource;
      await privateClient.storeObject('resource', getResourcePath(id), updated);
      return updated;
    };

    // Delete resource (soft delete by default)
    const remove = async (id: string, hard: boolean = false): Promise<boolean> => {
      if (hard) {
        await privateClient.remove(getResourcePath(id));
      } else {
        await update(id, { status: 'deleted' });
      }
      return true;
    };

    // Archive resource
    const archive = async (id: string): Promise<Resource | null> => {
      return update(id, { status: 'archived' });
    };

    // Restore resource
    const restore = async (id: string): Promise<Resource | null> => {
      return update(id, { status: 'active' });
    };

    // Toggle favorite
    const toggleFavorite = async (id: string): Promise<Resource | null> => {
      const existing = await get(id);
      if (!existing) return null;
      return update(id, { isFavorite: !existing.isFavorite });
    };

    // Add category to resource
    const addCategory = async (id: string, categoryId: string): Promise<Resource | null> => {
      const existing = await get(id);
      if (!existing) return null;
      const categoryIds = [...new Set([...existing.categoryIds, categoryId])];
      return update(id, { categoryIds });
    };

    // Remove category from resource
    const removeCategory = async (id: string, categoryId: string): Promise<Resource | null> => {
      const existing = await get(id);
      if (!existing) return null;
      const categoryIds = existing.categoryIds.filter((c) => c !== categoryId);
      return update(id, { categoryIds });
    };

    // Add topic to resource
    const addTopic = async (id: string, topicId: string): Promise<Resource | null> => {
      const existing = await get(id);
      if (!existing) return null;
      const topicIds = [...new Set([...existing.topicIds, topicId])];
      return update(id, { topicIds });
    };

    // Remove topic from resource
    const removeTopic = async (id: string, topicId: string): Promise<Resource | null> => {
      const existing = await get(id);
      if (!existing) return null;
      const topicIds = existing.topicIds.filter((t) => t !== topicId);
      return update(id, { topicIds });
    };

    // Add tag to resource
    const addTag = async (id: string, tag: string): Promise<Resource | null> => {
      const existing = await get(id);
      if (!existing) return null;
      const tags = [...new Set([...existing.tags, tag])];
      return update(id, { tags });
    };

    // Remove tag from resource
    const removeTag = async (id: string, tag: string): Promise<Resource | null> => {
      const existing = await get(id);
      if (!existing) return null;
      const tags = existing.tags.filter((t) => t !== tag);
      return update(id, { tags });
    };

    // Search resources
    const search = async (query: string): Promise<Resource[]> => {
      const all = await getAll();
      const lowerQuery = query.toLowerCase();
      return Object.values(all).filter(
        (r) =>
          r.title.toLowerCase().includes(lowerQuery) ||
          r.description?.toLowerCase().includes(lowerQuery) ||
          r.tags.some((t) => t.toLowerCase().includes(lowerQuery)) ||
          r.notes?.toLowerCase().includes(lowerQuery)
      );
    };

    // Listen to changes
    const onChange = (callback: (event: unknown) => void) => {
      privateClient.on('change', callback);
      return () => (privateClient as any).removeEventListener('change', callback);
    };

    return {
      exports: {
        getAll,
        get,
        getByType,
        getByCategory,
        getByTopic,
        getByStatus,
        getFavorites,
        create,
        update,
        remove,
        archive,
        restore,
        toggleFavorite,
        addCategory,
        removeCategory,
        addTopic,
        removeTopic,
        addTag,
        removeTag,
        search,
        onChange,
      },
    };
  },
};
