/**
 * YouTube Fetcher
 * 
 * Fetches metadata for YouTube videos, shorts, playlists, and channels.
 * Uses the YouTube oEmbed API (no API key required) and noembed.com as fallback.
 */

import type { BaseFetcher, FetcherResult } from './base';
import type { ResourceType } from '../../types';
import { parseYouTubeVideoId, parseYouTubePlaylistId } from '../detection/detector';

export const youtubeFetcher: BaseFetcher = {
  id: 'youtube',
  name: 'YouTube',
  supportedTypes: ['youtube-video', 'youtube-short', 'youtube-playlist', 'youtube-channel'],
  priority: 100,

  canHandle(input: string, detectedType?: ResourceType): boolean {
    if (detectedType && this.supportedTypes.includes(detectedType)) {
      return true;
    }
    return (
      input.includes('youtube.com') ||
      input.includes('youtu.be')
    );
  },

  async fetch(input: string, detectedType?: ResourceType): Promise<FetcherResult> {
    try {
      // For videos and shorts, use oEmbed
      if (detectedType === 'youtube-video' || detectedType === 'youtube-short') {
        return await fetchYouTubeVideo(input, detectedType);
      }
      
      // For playlists
      if (detectedType === 'youtube-playlist') {
        return await fetchYouTubePlaylist(input);
      }

      // For channels
      if (detectedType === 'youtube-channel') {
        return await fetchYouTubeChannel(input);
      }

      // Fallback: try to fetch as video
      return await fetchYouTubeVideo(input, 'youtube-video');
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch YouTube data',
      };
    }
  },
};

async function fetchYouTubeVideo(url: string, type: 'youtube-video' | 'youtube-short'): Promise<FetcherResult> {
  const videoId = parseYouTubeVideoId(url) || url.match(/shorts\/([a-zA-Z0-9_-]{11})/)?.[1];
  
  if (!videoId) {
    return { success: false, error: 'Could not extract video ID' };
  }

  // Use noembed.com to avoid CORS issues
  const oembedUrl = `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`;
  
  try {
    const response = await fetch(oembedUrl);
    if (!response.ok) {
      throw new Error('oEmbed request failed');
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }

    return {
      success: true,
      data: {
        type,
        title: data.title || 'Untitled Video',
        description: data.description,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnailUrl: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        metadata: {
          videoId,
          channelTitle: data.author_name,
          channelId: data.author_url?.split('/').pop(),
          embedUrl: `https://www.youtube.com/embed/${videoId}`,
          providerName: data.provider_name,
        },
      },
    };
  } catch {
    // Fallback: return basic data with thumbnail
    return {
      success: true,
      data: {
        type,
        title: 'YouTube Video',
        url: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        metadata: {
          videoId,
          embedUrl: `https://www.youtube.com/embed/${videoId}`,
        },
      },
    };
  }
}

async function fetchYouTubePlaylist(url: string): Promise<FetcherResult> {
  const playlistId = parseYouTubePlaylistId(url);
  
  if (!playlistId) {
    return { success: false, error: 'Could not extract playlist ID' };
  }

  // YouTube doesn't have oEmbed for playlists, so we return basic info
  return {
    success: true,
    data: {
      type: 'youtube-playlist',
      title: 'YouTube Playlist',
      url: `https://www.youtube.com/playlist?list=${playlistId}`,
      thumbnailUrl: `https://i.ytimg.com/vi/${playlistId}/default.jpg`,
      metadata: {
        playlistId,
      },
    },
  };
}

async function fetchYouTubeChannel(url: string): Promise<FetcherResult> {
  // Extract channel identifier from URL
  const channelMatch = url.match(/(?:channel\/|@|c\/|user\/)([a-zA-Z0-9_-]+)/);
  const channelId = channelMatch?.[1];

  if (!channelId) {
    return { success: false, error: 'Could not extract channel ID' };
  }

  // Return basic info (full channel data requires API key)
  return {
    success: true,
    data: {
      type: 'youtube-channel',
      title: channelId.startsWith('@') ? channelId : `Channel: ${channelId}`,
      url,
      metadata: {
        channelId,
        customUrl: url.includes('@') ? channelId : undefined,
      },
    },
  };
}

export default youtubeFetcher;
