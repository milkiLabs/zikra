/**
 * Base Fetcher Interface
 * 
 * All fetchers must implement this interface for the pluggable architecture.
 */

import type { ResourceType, ResourceInput } from '../../types';

/**
 * Fetcher result data - partial resource input
 */
export interface FetcherResultData {
  type: ResourceType;
  title: string;
  description?: string;
  url?: string;
  thumbnailUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface FetcherResult {
  success: boolean;
  data?: FetcherResultData;
  error?: string;
}

export interface BaseFetcher {
  /** Unique identifier for this fetcher */
  id: string;
  
  /** Display name */
  name: string;
  
  /** Resource types this fetcher handles */
  supportedTypes: ResourceType[];
  
  /** Priority (higher = tried first) */
  priority: number;
  
  /** Check if this fetcher can handle the given input */
  canHandle(input: string, detectedType?: ResourceType): boolean;
  
  /** Fetch metadata for the resource */
  fetch(input: string, detectedType?: ResourceType): Promise<FetcherResult>;
}

/**
 * Fetcher Registry
 * 
 * Manages all registered fetchers and orchestrates fetching.
 */
class FetcherRegistry {
  private fetchers: Map<string, BaseFetcher> = new Map();

  /**
   * Register a new fetcher
   */
  register(fetcher: BaseFetcher): void {
    this.fetchers.set(fetcher.id, fetcher);
  }

  /**
   * Unregister a fetcher
   */
  unregister(id: string): boolean {
    return this.fetchers.delete(id);
  }

  /**
   * Get a fetcher by ID
   */
  get(id: string): BaseFetcher | undefined {
    return this.fetchers.get(id);
  }

  /**
   * Get all fetchers sorted by priority
   */
  getAll(): BaseFetcher[] {
    return Array.from(this.fetchers.values()).sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get fetchers that can handle the given input
   */
  getFetchersFor(input: string, detectedType?: ResourceType): BaseFetcher[] {
    return this.getAll().filter((f) => f.canHandle(input, detectedType));
  }

  /**
   * Fetch using the first matching fetcher
   */
  async fetchFirst(input: string, detectedType?: ResourceType): Promise<FetcherResult> {
    const fetchers = this.getFetchersFor(input, detectedType);
    
    if (fetchers.length === 0) {
      return {
        success: false,
        error: 'No fetcher available for this resource type',
      };
    }

    // Try fetchers in priority order
    for (const fetcher of fetchers) {
      try {
        const result = await fetcher.fetch(input, detectedType);
        if (result.success) {
          return result;
        }
      } catch (error) {
        console.warn(`Fetcher ${fetcher.id} failed:`, error);
      }
    }

    return {
      success: false,
      error: 'All fetchers failed',
    };
  }

  /**
   * Fetch using all matching fetchers and merge results
   */
  async fetchAll(input: string, detectedType?: ResourceType): Promise<FetcherResult> {
    const fetchers = this.getFetchersFor(input, detectedType);
    
    if (fetchers.length === 0) {
      return {
        success: false,
        error: 'No fetcher available for this resource type',
      };
    }

    const results = await Promise.allSettled(
      fetchers.map((f) => f.fetch(input, detectedType))
    );

    // Merge all successful results
    let mergedData: FetcherResultData | undefined;
    let hasSuccess = false;

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.success && result.value.data) {
        hasSuccess = true;
        if (!mergedData) {
          mergedData = { ...result.value.data };
        } else {
          // Merge metadata
          mergedData = {
            ...mergedData,
            ...result.value.data,
            metadata: {
              ...mergedData.metadata,
              ...result.value.data.metadata,
            },
          };
        }
      }
    }

    if (hasSuccess && mergedData) {
      return { success: true, data: mergedData };
    }

    return {
      success: false,
      error: 'All fetchers failed',
    };
  }
}

// Global fetcher registry instance
export const fetcherRegistry = new FetcherRegistry();
