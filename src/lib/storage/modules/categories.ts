/**
 * Categories RemoteStorage Module
 * 
 * Handles storage of categories
 */

import type { RSModule } from 'remotestoragejs';
import type { Category } from '../../../types';

// JSON Schema for category
const categorySchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string' },
    color: { type: 'string' },
    icon: { type: 'string' },
    parentId: { type: 'string' },
    order: { type: 'number', default: 0 },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
  },
  required: ['id', 'name', 'order', 'createdAt', 'updatedAt'],
};

export const categoriesModule: RSModule = {
  name: 'categories',
  builder: (privateClient) => {
    // Declare the category type
    privateClient.declareType('category', categorySchema);

    // Helper to generate path from ID
    const getCategoryPath = (id: string): string => `categories/${id}`;

    // Get all categories (offline-first: maxAge=false)
    const getAll = async (): Promise<Record<string, Category>> => {
      const listing = await privateClient.getAll('categories/', false);
      return (listing as Record<string, Category>) || {};
    };

    // Get category by ID
    const get = async (id: string): Promise<Category | null> => {
      try {
        const category = await privateClient.getObject(getCategoryPath(id), false);
        return category as Category | null;
      } catch {
        return null;
      }
    };

    // Get child categories
    const getChildren = async (parentId: string): Promise<Category[]> => {
      const all = await getAll();
      return Object.values(all)
        .filter((c) => c.parentId === parentId)
        .sort((a, b) => a.order - b.order);
    };

    // Get root categories (no parent)
    const getRoots = async (): Promise<Category[]> => {
      const all = await getAll();
      return Object.values(all)
        .filter((c) => !c.parentId)
        .sort((a, b) => a.order - b.order);
    };

    // Create category
    const create = async (category: Omit<Category, 'createdAt' | 'updatedAt'>): Promise<Category> => {
      const now = new Date().toISOString();
      const newCategory: Category = {
        ...category,
        createdAt: now,
        updatedAt: now,
      };
      await privateClient.storeObject('category', getCategoryPath(category.id), newCategory);
      return newCategory;
    };

    // Update category
    const update = async (id: string, updates: Partial<Category>): Promise<Category | null> => {
      const existing = await get(id);
      if (!existing) return null;

      const updated: Category = {
        ...existing,
        ...updates,
        id, // Ensure ID doesn't change
        updatedAt: new Date().toISOString(),
      };
      await privateClient.storeObject('category', getCategoryPath(id), updated);
      return updated;
    };

    // Delete category
    const remove = async (id: string): Promise<boolean> => {
      await privateClient.remove(getCategoryPath(id));
      return true;
    };

    // Reorder categories
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
        getChildren,
        getRoots,
        create,
        update,
        remove,
        reorder,
        onChange,
      },
    };
  },
};
