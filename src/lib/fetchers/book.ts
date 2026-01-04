/**
 * Book Fetcher
 * 
 * Fetches metadata for books using Open Library API (free, no API key required).
 */

import type { BaseFetcher, FetcherResult } from './base';
import type { ResourceType, BookResource } from '../../types';
import { parseISBN, isValidISBN } from '../detection/detector';

export const bookFetcher: BaseFetcher = {
  id: 'book',
  name: 'Book',
  supportedTypes: ['book'],
  priority: 100,

  canHandle(input: string, detectedType?: ResourceType): boolean {
    if (detectedType === 'book') return true;
    
    // Check if input looks like an ISBN
    const isbn = parseISBN(input);
    if (isbn && isValidISBN(isbn)) return true;

    // Check for book-related URLs
    return (
      input.includes('openlibrary.org') ||
      input.includes('goodreads.com') ||
      input.includes('books.google.com')
    );
  },

  async fetch(input: string, detectedType?: ResourceType): Promise<FetcherResult> {
    try {
      // Try to extract ISBN
      const isbn = parseISBN(input);
      
      if (isbn && isValidISBN(isbn)) {
        return await fetchByISBN(isbn);
      }

      // Check if it's an Open Library URL
      const workMatch = input.match(/openlibrary\.org\/works\/(OL\w+)/);
      if (workMatch) {
        return await fetchByOpenLibraryWork(workMatch[1]);
      }

      // Try to search by title
      if (!input.includes('://')) {
        return await searchByTitle(input);
      }

      return {
        success: false,
        error: 'Could not identify book from input',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch book data',
      };
    }
  },
};

async function fetchByISBN(isbn: string): Promise<FetcherResult> {
  const cleanISBN = isbn.replace(/-/g, '');
  
  // Use Open Library ISBN API
  const response = await fetch(
    `https://openlibrary.org/api/books?bibkeys=ISBN:${cleanISBN}&format=json&jscmd=data`
  );
  
  if (!response.ok) {
    throw new Error('Open Library request failed');
  }

  const data = await response.json();
  const bookData = data[`ISBN:${cleanISBN}`];

  if (!bookData) {
    // Try the search API as fallback
    return await searchByISBN(cleanISBN);
  }

  return {
    success: true,
    data: {
      type: 'book',
      title: bookData.title,
      description: bookData.subtitle,
      url: bookData.url || `https://openlibrary.org/isbn/${cleanISBN}`,
      thumbnailUrl: bookData.cover?.large || bookData.cover?.medium || bookData.cover?.small,
      metadata: {
        isbn: cleanISBN.length === 10 ? cleanISBN : undefined,
        isbn13: cleanISBN.length === 13 ? cleanISBN : undefined,
        authors: bookData.authors?.map((a: any) => a.name) || [],
        publisher: bookData.publishers?.[0]?.name,
        publishedDate: bookData.publish_date,
        pageCount: bookData.number_of_pages,
        categories: bookData.subjects?.map((s: any) => s.name).slice(0, 5) || [],
        infoLink: bookData.url,
        coverImage: bookData.cover?.large || bookData.cover?.medium,
      },
    },
  };
}

async function searchByISBN(isbn: string): Promise<FetcherResult> {
  const response = await fetch(
    `https://openlibrary.org/search.json?isbn=${isbn}&limit=1`
  );
  
  if (!response.ok) {
    throw new Error('Open Library search failed');
  }

  const data = await response.json();
  
  if (!data.docs || data.docs.length === 0) {
    return { success: false, error: 'Book not found' };
  }

  const book = data.docs[0];
  const coverId = book.cover_i;
  
  return {
    success: true,
    data: {
      type: 'book',
      title: book.title,
      description: book.subtitle,
      url: `https://openlibrary.org${book.key}`,
      thumbnailUrl: coverId 
        ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
        : undefined,
      metadata: {
        isbn: isbn.length === 10 ? isbn : undefined,
        isbn13: isbn.length === 13 ? isbn : undefined,
        authors: book.author_name || [],
        publisher: book.publisher?.[0],
        publishedDate: book.first_publish_year?.toString(),
        pageCount: book.number_of_pages_median,
        language: book.language?.[0],
        categories: book.subject?.slice(0, 5) || [],
      },
    },
  };
}

async function fetchByOpenLibraryWork(workId: string): Promise<FetcherResult> {
  const response = await fetch(
    `https://openlibrary.org/works/${workId}.json`
  );
  
  if (!response.ok) {
    throw new Error('Open Library work fetch failed');
  }

  const data = await response.json();
  const coverId = data.covers?.[0];

  return {
    success: true,
    data: {
      type: 'book',
      title: data.title,
      description: typeof data.description === 'string' 
        ? data.description 
        : data.description?.value,
      url: `https://openlibrary.org/works/${workId}`,
      thumbnailUrl: coverId 
        ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
        : undefined,
      metadata: {
        authors: [],
        categories: data.subjects?.slice(0, 5) || [],
      },
    },
  };
}

async function searchByTitle(title: string): Promise<FetcherResult> {
  const response = await fetch(
    `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&limit=1`
  );
  
  if (!response.ok) {
    throw new Error('Open Library search failed');
  }

  const data = await response.json();
  
  if (!data.docs || data.docs.length === 0) {
    return { success: false, error: 'Book not found' };
  }

  const book = data.docs[0];
  const coverId = book.cover_i;
  const isbn = book.isbn?.[0];
  
  return {
    success: true,
    data: {
      type: 'book',
      title: book.title,
      description: book.subtitle,
      url: `https://openlibrary.org${book.key}`,
      thumbnailUrl: coverId 
        ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
        : undefined,
      metadata: {
        isbn: isbn && isbn.length === 10 ? isbn : undefined,
        isbn13: isbn && isbn.length === 13 ? isbn : undefined,
        authors: book.author_name || [],
        publisher: book.publisher?.[0],
        publishedDate: book.first_publish_year?.toString(),
        pageCount: book.number_of_pages_median,
        language: book.language?.[0],
        categories: book.subject?.slice(0, 5) || [],
      },
    },
  };
}

export default bookFetcher;
