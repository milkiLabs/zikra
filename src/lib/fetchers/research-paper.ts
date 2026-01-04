/**
 * Research Paper Fetcher
 * 
 * Fetches metadata for research papers using:
 * - CrossRef API (for DOIs)
 * - arXiv API
 * - Semantic Scholar API
 */

import type { BaseFetcher, FetcherResult } from './base';
import type { ResourceType } from '../../types';
import { parseDOI } from '../detection/detector';

export const researchPaperFetcher: BaseFetcher = {
  id: 'research-paper',
  name: 'Research Paper',
  supportedTypes: ['research-paper'],
  priority: 100,

  canHandle(input: string, detectedType?: ResourceType): boolean {
    if (detectedType === 'research-paper') return true;
    
    // Check for DOI
    if (parseDOI(input)) return true;

    // Check for paper-related URLs
    return (
      input.includes('doi.org') ||
      input.includes('arxiv.org') ||
      input.includes('semanticscholar.org') ||
      input.includes('pubmed.ncbi.nlm.nih.gov') ||
      input.includes('ncbi.nlm.nih.gov/pubmed') ||
      input.includes('researchgate.net') ||
      input.includes('scholar.google.com')
    );
  },

  async fetch(input: string, detectedType?: ResourceType): Promise<FetcherResult> {
    try {
      // Check for DOI
      const doi = parseDOI(input);
      if (doi) {
        return await fetchByDOI(doi);
      }

      // Check for arXiv
      const arxivMatch = input.match(/arxiv\.org\/(?:abs|pdf)\/(\d{4}\.\d{4,5}(?:v\d+)?)/);
      if (arxivMatch) {
        return await fetchFromArxiv(arxivMatch[1]);
      }

      // Check for Semantic Scholar
      const s2Match = input.match(/semanticscholar\.org\/paper\/([a-f0-9]+)/i);
      if (s2Match) {
        return await fetchFromSemanticScholar(s2Match[1]);
      }

      // Try searching by title on Semantic Scholar
      if (!input.includes('://')) {
        return await searchByTitle(input);
      }

      return {
        success: false,
        error: 'Could not identify research paper from input',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch paper data',
      };
    }
  },
};

async function fetchByDOI(doi: string): Promise<FetcherResult> {
  // Use CrossRef API
  const response = await fetch(
    `https://api.crossref.org/works/${encodeURIComponent(doi)}`,
    {
      headers: {
        'Accept': 'application/json',
      },
    }
  );
  
  if (!response.ok) {
    // Fallback to Semantic Scholar
    return await searchByDOI(doi);
  }

  const data = await response.json();
  const work = data.message;

  const authors = work.author?.map((a: any) => 
    `${a.given || ''} ${a.family || ''}`.trim()
  ) || [];

  return {
    success: true,
    data: {
      type: 'research-paper',
      title: work.title?.[0] || 'Untitled Paper',
      description: work.abstract?.replace(/<[^>]*>/g, ''), // Strip HTML
      url: `https://doi.org/${doi}`,
      metadata: {
        doi,
        authors,
        journal: work['container-title']?.[0],
        volume: work.volume,
        issue: work.issue,
        pages: work.page,
        publishedDate: work.published?.['date-parts']?.[0]?.join('-'),
        abstract: work.abstract?.replace(/<[^>]*>/g, ''),
        keywords: work.subject || [],
      },
    },
  };
}

async function searchByDOI(doi: string): Promise<FetcherResult> {
  // Use Semantic Scholar API
  const response = await fetch(
    `https://api.semanticscholar.org/graph/v1/paper/DOI:${encodeURIComponent(doi)}?fields=title,abstract,authors,year,venue,citationCount,openAccessPdf,externalIds`,
  );
  
  if (!response.ok) {
    return { success: false, error: 'Paper not found' };
  }

  const paper = await response.json();

  return {
    success: true,
    data: {
      type: 'research-paper',
      title: paper.title || 'Untitled Paper',
      description: paper.abstract,
      url: `https://doi.org/${doi}`,
      metadata: {
        doi,
        authors: paper.authors?.map((a: any) => a.name) || [],
        journal: paper.venue,
        publishedDate: paper.year?.toString(),
        abstract: paper.abstract,
        citations: paper.citationCount,
        pdfUrl: paper.openAccessPdf?.url,
        arxivId: paper.externalIds?.ArXiv,
      },
    },
  };
}

async function fetchFromArxiv(arxivId: string): Promise<FetcherResult> {
  // arXiv API returns XML, use a proxy or parse it
  const response = await fetch(
    `https://export.arxiv.org/api/query?id_list=${arxivId}`
  );
  
  if (!response.ok) {
    throw new Error('arXiv API request failed');
  }

  const text = await response.text();
  
  // Parse XML (basic parsing)
  const getTag = (xml: string, tag: string): string => {
    const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
    return match?.[1]?.trim() || '';
  };

  const getAllTags = (xml: string, tag: string): string[] => {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'gi');
    const matches = [];
    let match;
    while ((match = regex.exec(xml)) !== null) {
      matches.push(match[1].trim());
    }
    return matches;
  };

  // Extract entry
  const entry = getTag(text, 'entry');
  if (!entry) {
    return { success: false, error: 'arXiv paper not found' };
  }

  const title = getTag(entry, 'title').replace(/\s+/g, ' ');
  const summary = getTag(entry, 'summary').replace(/\s+/g, ' ');
  const authors = getAllTags(entry, 'name');
  const published = getTag(entry, 'published');
  const categories = getAllTags(entry, 'category').map(c => {
    const match = c.match(/term="([^"]+)"/);
    return match?.[1] || '';
  }).filter(Boolean);

  // Find PDF link
  const pdfMatch = entry.match(/href="([^"]+\.pdf)"/);
  const pdfUrl = pdfMatch?.[1];

  return {
    success: true,
    data: {
      type: 'research-paper',
      title,
      description: summary,
      url: `https://arxiv.org/abs/${arxivId}`,
      metadata: {
        arxivId,
        authors,
        publishedDate: published?.split('T')[0],
        abstract: summary,
        keywords: categories,
        pdfUrl: pdfUrl || `https://arxiv.org/pdf/${arxivId}.pdf`,
      },
    },
  };
}

async function fetchFromSemanticScholar(paperId: string): Promise<FetcherResult> {
  const response = await fetch(
    `https://api.semanticscholar.org/graph/v1/paper/${paperId}?fields=title,abstract,authors,year,venue,citationCount,openAccessPdf,externalIds`
  );
  
  if (!response.ok) {
    return { success: false, error: 'Paper not found' };
  }

  const paper = await response.json();

  return {
    success: true,
    data: {
      type: 'research-paper',
      title: paper.title || 'Untitled Paper',
      description: paper.abstract,
      url: `https://www.semanticscholar.org/paper/${paperId}`,
      metadata: {
        doi: paper.externalIds?.DOI,
        arxivId: paper.externalIds?.ArXiv,
        pmid: paper.externalIds?.PubMed,
        authors: paper.authors?.map((a: any) => a.name) || [],
        journal: paper.venue,
        publishedDate: paper.year?.toString(),
        abstract: paper.abstract,
        citations: paper.citationCount,
        pdfUrl: paper.openAccessPdf?.url,
      },
    },
  };
}

async function searchByTitle(title: string): Promise<FetcherResult> {
  const response = await fetch(
    `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(title)}&limit=1&fields=title,abstract,authors,year,venue,citationCount,openAccessPdf,externalIds`
  );
  
  if (!response.ok) {
    return { success: false, error: 'Search failed' };
  }

  const data = await response.json();
  
  if (!data.data || data.data.length === 0) {
    return { success: false, error: 'Paper not found' };
  }

  const paper = data.data[0];

  return {
    success: true,
    data: {
      type: 'research-paper',
      title: paper.title || 'Untitled Paper',
      description: paper.abstract,
      url: paper.externalIds?.DOI 
        ? `https://doi.org/${paper.externalIds.DOI}`
        : `https://www.semanticscholar.org/paper/${paper.paperId}`,
      metadata: {
        doi: paper.externalIds?.DOI,
        arxivId: paper.externalIds?.ArXiv,
        pmid: paper.externalIds?.PubMed,
        authors: paper.authors?.map((a: any) => a.name) || [],
        journal: paper.venue,
        publishedDate: paper.year?.toString(),
        abstract: paper.abstract,
        citations: paper.citationCount,
        pdfUrl: paper.openAccessPdf?.url,
      },
    },
  };
}

export default researchPaperFetcher;
