/**
 * Webpage/Article Fetcher
 * 
 * Fetches metadata for generic webpages and articles using
 * a CORS proxy to extract Open Graph and meta tags.
 */

import type { BaseFetcher, FetcherResult } from './base';
import type { ResourceType } from '../../types';

// List of CORS proxies to try (in order)
const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
  'https://api.codetabs.com/v1/proxy?quest=',
];

export const webpageFetcher: BaseFetcher = {
  id: 'webpage',
  name: 'Webpage/Article',
  supportedTypes: ['webpage', 'article'],
  priority: 10, // Low priority - fallback for other fetchers

  canHandle(input: string, detectedType?: ResourceType): boolean {
    if (detectedType === 'webpage' || detectedType === 'article') return true;
    
    // Check if it's a valid URL
    try {
      new URL(input);
      return true;
    } catch {
      return false;
    }
  },

  async fetch(input: string, detectedType?: ResourceType): Promise<FetcherResult> {
    try {
      // First try using the JSON-LD API (if available)
      const jsonLdResult = await tryJsonLd(input);
      if (jsonLdResult.success) {
        return jsonLdResult;
      }

      // Try fetching with CORS proxy
      const htmlResult = await fetchWithProxy(input);
      if (htmlResult.success) {
        return htmlResult;
      }

      // Fallback: return basic info from URL
      return {
        success: true,
        data: {
          type: detectedType || 'webpage',
          title: new URL(input).hostname,
          url: input,
          metadata: {
            siteName: new URL(input).hostname,
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch webpage data',
      };
    }
  },
};

async function tryJsonLd(url: string): Promise<FetcherResult> {
  // Some sites expose their metadata through JSON-LD endpoints
  // This is a placeholder for potential future implementation
  return { success: false, error: 'JSON-LD not available' };
}

async function fetchWithProxy(url: string): Promise<FetcherResult> {
  let lastError = '';

  for (const proxy of CORS_PROXIES) {
    try {
      const response = await fetch(proxy + encodeURIComponent(url), {
        headers: {
          'Accept': 'text/html',
        },
      });

      if (!response.ok) {
        lastError = `Proxy returned ${response.status}`;
        continue;
      }

      const html = await response.text();
      return parseHtml(html, url);
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Fetch failed';
    }
  }

  return { success: false, error: lastError };
}

function parseHtml(html: string, url: string): FetcherResult {
  // Extract meta tags
  const getMeta = (name: string): string | undefined => {
    // Try property first (for OG tags)
    let match = html.match(new RegExp(`<meta[^>]*property=["']${name}["'][^>]*content=["']([^"']+)["']`, 'i'));
    if (!match) {
      match = html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']${name}["']`, 'i'));
    }
    // Try name attribute
    if (!match) {
      match = html.match(new RegExp(`<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']+)["']`, 'i'));
    }
    if (!match) {
      match = html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*name=["']${name}["']`, 'i'));
    }
    return match?.[1];
  };

  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = getMeta('og:title') || getMeta('twitter:title') || titleMatch?.[1]?.trim() || 'Untitled';

  // Extract description
  const description = getMeta('og:description') || getMeta('twitter:description') || getMeta('description');

  // Extract image
  const image = getMeta('og:image') || getMeta('twitter:image');

  // Extract site name
  const siteName = getMeta('og:site_name') || new URL(url).hostname;

  // Extract type
  const ogType = getMeta('og:type');
  const isArticle = ogType === 'article' || 
    html.includes('<article') || 
    html.includes('class="article') ||
    html.includes('class="post');

  // Extract author
  const author = getMeta('author') || getMeta('article:author');

  // Extract published date
  const publishedDate = getMeta('article:published_time') || getMeta('datePublished');

  // Extract language
  const langMatch = html.match(/<html[^>]*lang=["']([^"']+)["']/i);
  const language = langMatch?.[1];

  // Estimate reading time (rough estimate)
  const textContent = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const wordCount = textContent.split(' ').length;
  const readingTime = Math.ceil(wordCount / 200); // Assuming 200 words per minute

  return {
    success: true,
    data: {
      type: isArticle ? 'article' : 'webpage',
      title: decodeHtmlEntities(title),
      description: description ? decodeHtmlEntities(description) : undefined,
      url,
      thumbnailUrl: image ? resolveUrl(image, url) : undefined,
      metadata: isArticle ? {
        author,
        siteName,
        publishedDate,
        readingTime,
        wordCount,
        excerpt: description ? decodeHtmlEntities(description) : undefined,
        mainImage: image ? resolveUrl(image, url) : undefined,
        language,
      } : {
        siteName,
        faviconUrl: `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`,
        ogImage: image ? resolveUrl(image, url) : undefined,
        ogType,
        language,
      },
    },
  };
}

function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&nbsp;': ' ',
  };
  
  return text.replace(/&[a-z0-9#]+;/gi, (entity) => {
    return entities[entity] || entity;
  });
}

function resolveUrl(path: string, baseUrl: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  try {
    return new URL(path, baseUrl).href;
  } catch {
    return path;
  }
}

export default webpageFetcher;
