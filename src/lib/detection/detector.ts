/**
 * Resource Type Detection System
 * 
 * Detects the type of resource from a URL and extracts relevant identifiers.
 */

import type { ResourceType, DetectionResult } from '../../types';

// URL patterns for different resource types
const patterns = {
  // YouTube patterns
  youtubeVideo: [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
  ],
  youtubeShort: [
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ],
  youtubePlaylist: [
    /youtube\.com\/playlist\?list=([a-zA-Z0-9_-]+)/,
    /youtube\.com\/watch\?.*list=([a-zA-Z0-9_-]+)/,
  ],
  youtubeChannel: [
    /youtube\.com\/channel\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/@([a-zA-Z0-9_-]+)/,
    /youtube\.com\/c\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/user\/([a-zA-Z0-9_-]+)/,
  ],

  // Research paper patterns
  doi: [
    /(?:doi\.org\/|doi:)(10\.\d{4,}(?:\.\d+)*\/[^\s]+)/i,
  ],
  arxiv: [
    /arxiv\.org\/(?:abs|pdf)\/(\d{4}\.\d{4,5}(?:v\d+)?)/,
  ],
  pubmed: [
    /(?:pubmed\.ncbi\.nlm\.nih\.gov|ncbi\.nlm\.nih\.gov\/pubmed)\/(\d+)/,
  ],

  // Book patterns
  isbn: [
    /(?:isbn[:\s]?)?(\d{13}|\d{10}|\d{3}-\d{10}|\d-\d{3}-\d{5}-\d)/i,
  ],
  googleBooks: [
    /books\.google\.com\/books\?id=([a-zA-Z0-9_-]+)/,
  ],
  goodreads: [
    /goodreads\.com\/book\/show\/(\d+)/,
  ],
  amazon: [
    /amazon\.com\/(?:dp|gp\/product)\/([A-Z0-9]{10})/,
  ],

  // Social/Content platforms
  twitter: [
    /(?:twitter\.com|x\.com)\/(\w+)\/status\/(\d+)/,
  ],
  github: [
    /github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)/,
  ],

  // Podcast patterns
  spotify: [
    /open\.spotify\.com\/(?:show|episode)\/([a-zA-Z0-9]+)/,
  ],
  applePodcast: [
    /podcasts\.apple\.com\/.*\/podcast\/.*\/id(\d+)/,
  ],
};

export interface DetectionMatch {
  type: ResourceType;
  pattern: RegExp;
  groups: string[];
}

/**
 * Detect the resource type from a URL
 */
export function detectResourceType(input: string): DetectionMatch | null {
  const url = input.trim();

  // YouTube Short
  for (const pattern of patterns.youtubeShort) {
    const match = url.match(pattern);
    if (match) {
      return { type: 'youtube-short', pattern, groups: [match[1]] };
    }
  }

  // YouTube Playlist (check before video as playlist URLs may contain video)
  for (const pattern of patterns.youtubePlaylist) {
    const match = url.match(pattern);
    if (match) {
      return { type: 'youtube-playlist', pattern, groups: [match[1]] };
    }
  }

  // YouTube Channel
  for (const pattern of patterns.youtubeChannel) {
    const match = url.match(pattern);
    if (match) {
      return { type: 'youtube-channel', pattern, groups: [match[1]] };
    }
  }

  // YouTube Video
  for (const pattern of patterns.youtubeVideo) {
    const match = url.match(pattern);
    if (match) {
      return { type: 'youtube-video', pattern, groups: [match[1]] };
    }
  }

  // DOI (Research Paper)
  for (const pattern of patterns.doi) {
    const match = url.match(pattern);
    if (match) {
      return { type: 'research-paper', pattern, groups: [match[1]] };
    }
  }

  // arXiv
  for (const pattern of patterns.arxiv) {
    const match = url.match(pattern);
    if (match) {
      return { type: 'research-paper', pattern, groups: [match[1]] };
    }
  }

  // PubMed
  for (const pattern of patterns.pubmed) {
    const match = url.match(pattern);
    if (match) {
      return { type: 'research-paper', pattern, groups: [match[1]] };
    }
  }

  // ISBN (for direct ISBN input)
  for (const pattern of patterns.isbn) {
    const match = url.match(pattern);
    if (match && !url.includes('://')) {
      return { type: 'book', pattern, groups: [match[1]] };
    }
  }

  // Google Books
  for (const pattern of patterns.googleBooks) {
    const match = url.match(pattern);
    if (match) {
      return { type: 'book', pattern, groups: [match[1]] };
    }
  }

  // Goodreads
  for (const pattern of patterns.goodreads) {
    const match = url.match(pattern);
    if (match) {
      return { type: 'book', pattern, groups: [match[1]] };
    }
  }

  // Amazon (likely a book)
  for (const pattern of patterns.amazon) {
    const match = url.match(pattern);
    if (match) {
      return { type: 'book', pattern, groups: [match[1]] };
    }
  }

  // Twitter/X
  for (const pattern of patterns.twitter) {
    const match = url.match(pattern);
    if (match) {
      return { type: 'twitter-thread', pattern, groups: [match[1], match[2]] };
    }
  }

  // GitHub
  for (const pattern of patterns.github) {
    const match = url.match(pattern);
    if (match) {
      return { type: 'github-repo', pattern, groups: [match[1], match[2]] };
    }
  }

  // Spotify Podcast
  for (const pattern of patterns.spotify) {
    const match = url.match(pattern);
    if (match) {
      const isPodcast = url.includes('/show/');
      return { 
        type: isPodcast ? 'podcast' : 'podcast-episode', 
        pattern, 
        groups: [match[1]] 
      };
    }
  }

  // Apple Podcast
  for (const pattern of patterns.applePodcast) {
    const match = url.match(pattern);
    if (match) {
      return { type: 'podcast', pattern, groups: [match[1]] };
    }
  }

  // Check if it's a valid URL - if so, it's a generic webpage/article
  try {
    new URL(url);
    // Check if it looks like an article (common article URL patterns)
    if (isLikelyArticle(url)) {
      return { type: 'article', pattern: /.+/, groups: [] };
    }
    return { type: 'webpage', pattern: /.+/, groups: [] };
  } catch {
    // Not a URL, could be a book title, DOI, ISBN, etc.
    return null;
  }
}

/**
 * Check if a URL looks like an article
 */
function isLikelyArticle(url: string): boolean {
  const articleIndicators = [
    '/article/',
    '/post/',
    '/blog/',
    '/news/',
    '/story/',
    '/p/',
    '/entries/',
    'medium.com',
    'dev.to',
    'hashnode.com',
    'substack.com',
  ];
  return articleIndicators.some((indicator) => url.includes(indicator));
}

/**
 * Parse YouTube video ID from URL
 */
export function parseYouTubeVideoId(url: string): string | null {
  for (const pattern of patterns.youtubeVideo) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Parse YouTube playlist ID from URL
 */
export function parseYouTubePlaylistId(url: string): string | null {
  for (const pattern of patterns.youtubePlaylist) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Parse DOI from string
 */
export function parseDOI(input: string): string | null {
  for (const pattern of patterns.doi) {
    const match = input.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Parse ISBN from string
 */
export function parseISBN(input: string): string | null {
  for (const pattern of patterns.isbn) {
    const match = input.match(pattern);
    if (match) return match[1].replace(/-/g, '');
  }
  return null;
}

/**
 * Validate ISBN (basic check)
 */
export function isValidISBN(isbn: string): boolean {
  const cleaned = isbn.replace(/[-\s]/g, '');
  return /^(\d{10}|\d{13})$/.test(cleaned);
}

/**
 * Parse GitHub repo from URL
 */
export function parseGitHubRepo(url: string): { owner: string; repo: string } | null {
  for (const pattern of patterns.github) {
    const match = url.match(pattern);
    if (match) return { owner: match[1], repo: match[2] };
  }
  return null;
}

/**
 * Get resource type display name
 */
export function getResourceTypeName(type: ResourceType): string {
  const names: Record<ResourceType, string> = {
    'youtube-video': 'YouTube Video',
    'youtube-short': 'YouTube Short',
    'youtube-playlist': 'YouTube Playlist',
    'youtube-channel': 'YouTube Channel',
    'book': 'Book',
    'research-paper': 'Research Paper',
    'article': 'Article',
    'webpage': 'Webpage',
    'podcast': 'Podcast',
    'podcast-episode': 'Podcast Episode',
    'twitter-thread': 'Twitter Thread',
    'github-repo': 'GitHub Repository',
    'custom': 'Custom',
  };
  return names[type] || type;
}

/**
 * Get resource type icon (emoji for now, can be replaced with icon component)
 */
export function getResourceTypeIcon(type: ResourceType): string {
  const icons: Record<ResourceType, string> = {
    'youtube-video': '📺',
    'youtube-short': '📱',
    'youtube-playlist': '📋',
    'youtube-channel': '📡',
    'book': '📚',
    'research-paper': '📄',
    'article': '📰',
    'webpage': '🌐',
    'podcast': '🎙️',
    'podcast-episode': '🎧',
    'twitter-thread': '🐦',
    'github-repo': '💻',
    'custom': '📦',
  };
  return icons[type] || '📦';
}
