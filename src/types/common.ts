/**
 * Utility Types and Helper Functions
 */

// Deep partial type
export type DeepPartial<T> = T extends object ? {
  [P in keyof T]?: DeepPartial<T[P]>;
} : T;

// Make certain keys required
export type RequireKeys<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

// Omit certain keys deeply
export type DeepOmit<T, K extends keyof T> = Omit<{
  [P in keyof T]: T[P] extends object ? DeepOmit<T[P], K & keyof T[P]> : T[P];
}, K>;

// Result type for async operations
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

// Async Result type
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

// Event handler types
export type EventCallback<T = unknown> = (data: T) => void;
export type UnsubscribeFn = () => void;

// Store update function
export type StoreSetter<T> = (value: T | ((prev: T) => T)) => void;

// Generic ID type
export type ID = string;

// Timestamp types
export type ISODateString = string;
export type UnixTimestamp = number;

// HTTP method types
export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

// API Response type
export interface APIResponse<T> {
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    requestId?: string;
    timestamp?: string;
  };
}

// Loading state
export interface LoadingState {
  isLoading: boolean;
  error: Error | null;
}

// App-wide settings
export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  defaultView: 'grid' | 'list' | 'compact';
  autoFetch: boolean;
  syncInterval: number;
  notifications: boolean;
  language: string;
  corsProxyUrl?: string;
}

// Share data from Web Share Target API
export interface ShareTargetData {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}
