/**
 * Fetchers Index
 * 
 * Registers all fetchers and exports the registry.
 */

import { fetcherRegistry } from './base';
import { youtubeFetcher } from './youtube';
import { bookFetcher } from './book';
import { researchPaperFetcher } from './research-paper';
import { webpageFetcher } from './webpage';
import { githubFetcher } from './github';

// Register all built-in fetchers
fetcherRegistry.register(youtubeFetcher);
fetcherRegistry.register(bookFetcher);
fetcherRegistry.register(researchPaperFetcher);
fetcherRegistry.register(githubFetcher);
fetcherRegistry.register(webpageFetcher); // Low priority fallback

// Export everything
export { fetcherRegistry } from './base';
export type { BaseFetcher, FetcherResult, FetcherResultData } from './base';
export { youtubeFetcher } from './youtube';
export { bookFetcher } from './book';
export { researchPaperFetcher } from './research-paper';
export { webpageFetcher } from './webpage';
export { githubFetcher } from './github';
