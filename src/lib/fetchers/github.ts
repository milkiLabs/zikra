/**
 * GitHub Repository Fetcher
 * 
 * Fetches metadata for GitHub repositories using the GitHub API.
 */

import type { BaseFetcher, FetcherResult } from './base';
import type { ResourceType } from '../../types';
import { parseGitHubRepo } from '../detection/detector';

export const githubFetcher: BaseFetcher = {
  id: 'github',
  name: 'GitHub',
  supportedTypes: ['github-repo'],
  priority: 100,

  canHandle(input: string, detectedType?: ResourceType): boolean {
    if (detectedType === 'github-repo') return true;
    return input.includes('github.com/');
  },

  async fetch(input: string, detectedType?: ResourceType): Promise<FetcherResult> {
    try {
      const repo = parseGitHubRepo(input);
      
      if (!repo) {
        return { success: false, error: 'Could not parse GitHub URL' };
      }

      const response = await fetch(
        `https://api.github.com/repos/${repo.owner}/${repo.repo}`,
        {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          return { success: false, error: 'Repository not found' };
        }
        throw new Error(`GitHub API returned ${response.status}`);
      }

      const data = await response.json();

      return {
        success: true,
        data: {
          type: 'github-repo',
          title: data.full_name,
          description: data.description,
          url: data.html_url,
          thumbnailUrl: data.owner?.avatar_url,
          metadata: {
            owner: data.owner?.login,
            repoName: data.name,
            fullName: data.full_name,
            stars: data.stargazers_count,
            forks: data.forks_count,
            language: data.language,
            topics: data.topics || [],
            license: data.license?.name,
            lastUpdated: data.updated_at,
            openIssues: data.open_issues_count,
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch GitHub data',
      };
    }
  },
};

export default githubFetcher;
