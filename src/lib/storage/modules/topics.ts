/**
 * Topics RemoteStorage Module
 * 
 * Handles storage of topics
 */

import type { RSModule } from 'remotestoragejs';
import type { Topic } from '../../../types';

// JSON Schema for topic
const topicSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string' },
    color: { type: 'string' },
    categoryIds: { type: 'array', items: { type: 'string' }, default: [] },
    order: { type: 'number', default: 0 },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
  },
  required: ['id', 'name', 'categoryIds', 'order', 'createdAt', 'updatedAt'],
};

export const topicsModule: RSModule = {
  name: 'topics',
  builder: (privateClient) => {
    // Declare the topic type
    privateClient.declareType('topic', topicSchema);

    // Helper to generate path from ID
    const getTopicPath = (id: string): string => `topics/${id}`;

    // Get all topics (offline-first: maxAge=false)
    const getAll = async (): Promise<Record<string, Topic>> => {
      const listing = await privateClient.getAll('topics/', false);
      return (listing as Record<string, Topic>) || {};
    };

    // Get topic by ID
    const get = async (id: string): Promise<Topic | null> => {
      try {
        const topic = await privateClient.getObject(getTopicPath(id), false);
        return topic as Topic | null;
      } catch {
        return null;
      }
    };

    // Get topics by category
    const getByCategory = async (categoryId: string): Promise<Topic[]> => {
      const all = await getAll();
      return Object.values(all)
        .filter((t) => t.categoryIds.includes(categoryId))
        .sort((a, b) => a.order - b.order);
    };

    // Create topic
    const create = async (topic: Omit<Topic, 'createdAt' | 'updatedAt'>): Promise<Topic> => {
      const now = new Date().toISOString();
      const newTopic: Topic = {
        ...topic,
        createdAt: now,
        updatedAt: now,
      };
      await privateClient.storeObject('topic', getTopicPath(topic.id), newTopic);
      return newTopic;
    };

    // Update topic
    const update = async (id: string, updates: Partial<Topic>): Promise<Topic | null> => {
      const existing = await get(id);
      if (!existing) return null;

      const updated: Topic = {
        ...existing,
        ...updates,
        id, // Ensure ID doesn't change
        updatedAt: new Date().toISOString(),
      };
      await privateClient.storeObject('topic', getTopicPath(id), updated);
      return updated;
    };

    // Delete topic
    const remove = async (id: string): Promise<boolean> => {
      await privateClient.remove(getTopicPath(id));
      return true;
    };

    // Add category to topic
    const addCategory = async (id: string, categoryId: string): Promise<Topic | null> => {
      const existing = await get(id);
      if (!existing) return null;
      const categoryIds = [...new Set([...existing.categoryIds, categoryId])];
      return update(id, { categoryIds });
    };

    // Remove category from topic
    const removeCategory = async (id: string, categoryId: string): Promise<Topic | null> => {
      const existing = await get(id);
      if (!existing) return null;
      const categoryIds = existing.categoryIds.filter((c) => c !== categoryId);
      return update(id, { categoryIds });
    };

    // Reorder topics
    const reorder = async (ids: string[]): Promise<void> => {
      const updates = ids.map((id, index) => update(id, { order: index }));
      await Promise.all(updates);
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
        getByCategory,
        create,
        update,
        remove,
        addCategory,
        removeCategory,
        reorder,
        onChange,
      },
    };
  },
};
