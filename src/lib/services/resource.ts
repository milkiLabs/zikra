/**
 * Resource Service
 * 
 * High-level service for adding and managing resources.
 * Combines detection, fetching, and storage operations.
 */

import { detectResourceType } from '../detection/detector';
import { fetcherRegistry, FetcherResultData } from '../fetchers';
import { resourceActions, resourcesStore } from '../stores';
import { generateId } from '../utils/id';
import type { Resource, CreateResourceInput, DetectionResult, ResourceType } from '../../types';

// Utility to remove undefined values (JSON doesn't support undefined)
function removeUndefined<T extends object>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined)
  ) as T;
}

export interface AddResourceOptions {
  /** Force a specific resource type instead of auto-detecting */
  forceType?: ResourceType;
  /** Skip auto-fetching metadata */
  skipFetch?: boolean;
  /** How the resource was added */
  addedVia?: 'manual' | 'auto' | 'extension' | 'share-target';
  /** Pre-populated category IDs */
  categoryIds?: string[];
  /** Pre-populated topic IDs */
  topicIds?: string[];
  /** Pre-populated tags */
  tags?: string[];
  /** Additional notes */
  notes?: string;
}

export interface AddResourceResult {
  success: boolean;
  resource?: Resource;
  error?: string;
  detectedType?: ResourceType;
  fetchedData?: FetcherResultData;
}

/**
 * Add a resource from URL or text input
 */
export async function addResource(
  input: string,
  options: AddResourceOptions = {}
): Promise<AddResourceResult> {
  const trimmedInput = input.trim();
  
  if (!trimmedInput) {
    return { success: false, error: 'Input is empty' };
  }

  try {
    // Step 1: Detect resource type
    const detected = options.forceType 
      ? { type: options.forceType, pattern: null, groups: [] }
      : detectResourceType(trimmedInput);

    const resourceType = detected?.type || 'custom';

    // Step 2: Fetch metadata (unless skipped)
    let fetchedData: FetcherResultData | undefined;
    
    if (!options.skipFetch) {
      const fetchResult = await fetcherRegistry.fetchFirst(trimmedInput, resourceType);
      if (fetchResult.success && fetchResult.data) {
        fetchedData = fetchResult.data;
      }
    }

    // Step 3: Build the resource object
    const now = new Date().toISOString();
    const resource = removeUndefined({
      id: generateId(),
      type: fetchedData?.type || resourceType,
      title: fetchedData?.title || extractTitleFromInput(trimmedInput),
      description: fetchedData?.description,
      url: fetchedData?.url || (isUrl(trimmedInput) ? trimmedInput : undefined),
      thumbnailUrl: fetchedData?.thumbnailUrl,
      categoryIds: options.categoryIds || [],
      topicIds: options.topicIds || [],
      tags: options.tags || [],
      notes: options.notes,
      status: 'active' as const,
      isFavorite: false,
      createdAt: now,
      updatedAt: now,
      addedVia: options.addedVia || 'manual',
      metadata: fetchedData?.metadata || {},
    }) as Resource;

    // Step 4: Save to storage
    const created = await resourceActions.create(resource);

    return {
      success: true,
      resource: created,
      detectedType: resourceType,
      fetchedData,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add resource',
    };
  }
}

/**
 * Add a resource with manual input (no auto-fetch)
 */
export async function addManualResource(
  data: {
    type?: ResourceType;
    title?: string;
    description?: string;
    url?: string;
    thumbnailUrl?: string;
    categoryIds?: string[];
    topicIds?: string[];
    tags?: string[];
    notes?: string;
    status?: 'pending' | 'active' | 'archived' | 'deleted';
    isFavorite?: boolean;
    metadata?: Record<string, unknown>;
  },
  options: Omit<AddResourceOptions, 'skipFetch'> = {}
): Promise<AddResourceResult> {
  try {
    const now = new Date().toISOString();
    const resource: Resource = removeUndefined({
      id: generateId(),
      type: data.type || 'custom',
      title: data.title || 'Untitled',
      description: data.description,
      url: data.url,
      thumbnailUrl: data.thumbnailUrl,
      categoryIds: options.categoryIds || data.categoryIds || [],
      topicIds: options.topicIds || data.topicIds || [],
      tags: options.tags || data.tags || [],
      notes: options.notes || data.notes,
      status: data.status || 'active',
      isFavorite: data.isFavorite || false,
      createdAt: now,
      updatedAt: now,
      addedVia: options.addedVia || 'manual',
      metadata: data.metadata || {},
    }) as Resource;

    const created = await resourceActions.create(resource);

    return {
      success: true,
      resource: created,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add resource',
    };
  }
}

/**
 * Detect resource type and preview metadata without saving
 */
export async function previewResource(input: string): Promise<{
  type: ResourceType;
  preview: FetcherResultData | Record<string, unknown>;
  confidence: number;
}> {
  const trimmedInput = input.trim();
  
  if (!trimmedInput) {
    return {
      type: 'custom',
      preview: {},
      confidence: 0,
    };
  }

  // Detect type
  const detected = detectResourceType(trimmedInput);
  const resourceType = detected?.type || 'custom';
  
  // Calculate confidence based on pattern match
  let confidence = detected ? 1 : 0;
  if (!detected && isUrl(trimmedInput)) {
    confidence = 0.5; // It's a URL but unknown type
  }

  // Fetch preview data
  const fetchResult = await fetcherRegistry.fetchFirst(trimmedInput, resourceType);
  
  return {
    type: resourceType,
    preview: fetchResult.success && fetchResult.data ? fetchResult.data : {},
    confidence,
  };
}

/**
 * Re-fetch metadata for an existing resource
 */
export async function refetchResource(id: string): Promise<AddResourceResult> {
  try {
    const resource = resourcesStore.items[id];
    
    if (!resource) {
      return { success: false, error: 'Resource not found' };
    }

    if (!resource.url) {
      return { success: false, error: 'Resource has no URL to refetch' };
    }

    const fetchResult = await fetcherRegistry.fetchFirst(resource.url, resource.type);
    
    if (!fetchResult.success || !fetchResult.data) {
      return { success: false, error: 'Failed to fetch metadata' };
    }

    // Update only fetched fields, preserve user-set fields
    const updateData = {
      title: fetchResult.data.title || resource.title,
      description: fetchResult.data.description || resource.description,
      thumbnailUrl: fetchResult.data.thumbnailUrl || resource.thumbnailUrl,
      metadata: {
        ...resource.metadata,
        ...fetchResult.data.metadata,
      },
    } as Partial<Resource>;
    
    const updated = await resourceActions.update(id, updateData);

    return {
      success: true,
      resource: updated as Resource,
      fetchedData: fetchResult.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to refetch resource',
    };
  }
}

// Helper functions

function isUrl(input: string): boolean {
  try {
    new URL(input);
    return true;
  } catch {
    return false;
  }
}

function extractTitleFromInput(input: string): string {
  // If it's a URL, use the hostname
  if (isUrl(input)) {
    try {
      const url = new URL(input);
      return url.hostname;
    } catch {
      return input;
    }
  }
  
  // Otherwise, use the input itself (truncated if too long)
  return input.length > 100 ? input.slice(0, 100) + '...' : input;
}

export const resourceService = {
  add: addResource,
  addManual: addManualResource,
  addResourceAuto: async (input: string, store?: any): Promise<Resource> => {
    const result = await addResource(input, { addedVia: 'auto' });
    if (!result.success || !result.resource) {
      throw new Error(result.error || 'Failed to add resource');
    }
    return result.resource;
  },
  preview: previewResource,
  refetch: refetchResource,
};

export default resourceService;
