/**
 * Core Resource Types for Zikra
 * 
 * This file defines all the resource types and related interfaces
 * for the local-first resource collection app.
 */

// Base resource types
export type ResourceType = 
  | 'youtube-video'
  | 'youtube-short'
  | 'youtube-playlist'
  | 'youtube-channel'
  | 'book'
  | 'research-paper'
  | 'article'
  | 'webpage'
  | 'podcast'
  | 'podcast-episode'
  | 'twitter-thread'
  | 'github-repo'
  | 'custom';

// Resource status
export type ResourceStatus = 'pending' | 'active' | 'archived' | 'deleted';

// Base resource interface
export interface BaseResource {
  id: string;
  type: ResourceType;
  title: string;
  description?: string;
  url?: string;
  thumbnailUrl?: string;
  categoryIds: string[];
  topicIds: string[];
  tags: string[];
  notes?: string;
  status: ResourceStatus;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  addedVia: 'manual' | 'auto' | 'extension' | 'share-target';
  metadata: Record<string, unknown>;
}

// YouTube Video
export interface YouTubeVideoResource extends BaseResource {
  type: 'youtube-video';
  metadata: {
    videoId: string;
    channelId?: string;
    channelTitle?: string;
    duration?: string;
    viewCount?: number;
    likeCount?: number;
    publishedAt?: string;
    embedUrl?: string;
  };
}

// YouTube Short
export interface YouTubeShortResource extends BaseResource {
  type: 'youtube-short';
  metadata: {
    videoId: string;
    channelId?: string;
    channelTitle?: string;
    duration?: string;
    viewCount?: number;
  };
}

// YouTube Playlist
export interface YouTubePlaylistResource extends BaseResource {
  type: 'youtube-playlist';
  metadata: {
    playlistId: string;
    channelId?: string;
    channelTitle?: string;
    itemCount?: number;
    videos?: Array<{
      videoId: string;
      title: string;
      position: number;
    }>;
  };
}

// YouTube Channel
export interface YouTubeChannelResource extends BaseResource {
  type: 'youtube-channel';
  metadata: {
    channelId: string;
    subscriberCount?: number;
    videoCount?: number;
    customUrl?: string;
    bannerUrl?: string;
  };
}

// Book
export interface BookResource extends BaseResource {
  type: 'book';
  metadata: {
    isbn?: string;
    isbn13?: string;
    authors: string[];
    publisher?: string;
    publishedDate?: string;
    pageCount?: number;
    language?: string;
    categories?: string[];
    averageRating?: number;
    ratingsCount?: number;
    previewLink?: string;
    infoLink?: string;
    coverImage?: string;
  };
}

// Research Paper
export interface ResearchPaperResource extends BaseResource {
  type: 'research-paper';
  metadata: {
    doi?: string;
    arxivId?: string;
    pmid?: string;
    authors: string[];
    journal?: string;
    volume?: string;
    issue?: string;
    pages?: string;
    publishedDate?: string;
    abstract?: string;
    pdfUrl?: string;
    citations?: number;
    keywords?: string[];
  };
}

// Article
export interface ArticleResource extends BaseResource {
  type: 'article';
  metadata: {
    author?: string;
    siteName?: string;
    publishedDate?: string;
    readingTime?: number;
    wordCount?: number;
    excerpt?: string;
    mainImage?: string;
    language?: string;
  };
}

// Webpage
export interface WebpageResource extends BaseResource {
  type: 'webpage';
  metadata: {
    siteName?: string;
    faviconUrl?: string;
    ogImage?: string;
    ogType?: string;
    language?: string;
  };
}

// Podcast
export interface PodcastResource extends BaseResource {
  type: 'podcast';
  metadata: {
    feedUrl?: string;
    author?: string;
    episodeCount?: number;
    categories?: string[];
    language?: string;
    explicit?: boolean;
  };
}

// Podcast Episode
export interface PodcastEpisodeResource extends BaseResource {
  type: 'podcast-episode';
  metadata: {
    podcastId?: string;
    podcastTitle?: string;
    episodeNumber?: number;
    seasonNumber?: number;
    duration?: string;
    audioUrl?: string;
    publishedDate?: string;
  };
}

// Twitter Thread
export interface TwitterThreadResource extends BaseResource {
  type: 'twitter-thread';
  metadata: {
    tweetId: string;
    authorUsername: string;
    authorDisplayName?: string;
    authorProfileImage?: string;
    tweetCount?: number;
    likes?: number;
    retweets?: number;
    createdAt?: string;
    threadContent?: string[];
  };
}

// GitHub Repo
export interface GitHubRepoResource extends BaseResource {
  type: 'github-repo';
  metadata: {
    owner: string;
    repoName: string;
    fullName: string;
    stars?: number;
    forks?: number;
    language?: string;
    topics?: string[];
    license?: string;
    lastUpdated?: string;
    openIssues?: number;
  };
}

// Custom Resource
export interface CustomResource extends BaseResource {
  type: 'custom';
  metadata: {
    customType?: string;
    customFields?: Record<string, unknown>;
  };
}

// Union type of all resources
export type Resource =
  | YouTubeVideoResource
  | YouTubeShortResource
  | YouTubePlaylistResource
  | YouTubeChannelResource
  | BookResource
  | ResearchPaperResource
  | ArticleResource
  | WebpageResource
  | PodcastResource
  | PodcastEpisodeResource
  | TwitterThreadResource
  | GitHubRepoResource
  | CustomResource;

/**
 * Resource Input - used for creating/updating resources
 * This is a looser type that allows any metadata
 */
export interface ResourceInput {
  id?: string;
  type: ResourceType;
  title: string;
  description?: string;
  url?: string;
  thumbnailUrl?: string;
  categoryIds?: string[];
  topicIds?: string[];
  tags?: string[];
  notes?: string;
  status?: ResourceStatus;
  isFavorite?: boolean;
  addedVia?: 'manual' | 'auto' | 'extension' | 'share-target';
  metadata?: Record<string, unknown>;
}

// Category
export interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  parentId?: string; // For nested categories
  order: number;
  createdAt: string;
  updatedAt: string;
}

// Topic
export interface Topic {
  id: string;
  name: string;
  description?: string;
  color?: string;
  categoryIds: string[]; // Topics can belong to multiple categories
  order: number;
  createdAt: string;
  updatedAt: string;
}

// Collection (optional grouping mechanism)
export interface Collection {
  id: string;
  name: string;
  description?: string;
  coverImage?: string;
  resourceIds: string[];
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

// Input types for creating resources
export interface CreateResourceInput {
  url?: string;
  title?: string;
  type?: ResourceType;
  description?: string;
  categoryIds?: string[];
  topicIds?: string[];
  tags?: string[];
  notes?: string;
  metadata?: Record<string, unknown>;
  addedVia?: 'manual' | 'auto' | 'extension' | 'share-target';
}

// Resource detection result
export interface DetectionResult {
  type: ResourceType;
  confidence: number;
  extractedData: Partial<Resource>;
  suggestions?: {
    categories?: Category[];
    topics?: Topic[];
    tags?: string[];
  };
}

// Filter options
export interface ResourceFilter {
  types?: ResourceType[];
  categoryIds?: string[];
  topicIds?: string[];
  tags?: string[];
  status?: ResourceStatus[];
  isFavorite?: boolean;
  search?: string;
  dateRange?: {
    start?: string;
    end?: string;
  };
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'type';
  sortOrder?: 'asc' | 'desc';
}

// Pagination
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}
