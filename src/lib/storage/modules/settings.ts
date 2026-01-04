/**
 * Settings RemoteStorage Module
 * 
 * Handles storage of app settings
 */

import type { RSModule } from 'remotestoragejs';
import type { AppSettings } from '../../../types';

// Default settings
const defaultSettings: AppSettings = {
  theme: 'system',
  defaultView: 'grid',
  autoFetch: true,
  syncInterval: 30000,
  notifications: true,
  language: 'en',
};

// JSON Schema for settings
const settingsSchema = {
  type: 'object',
  properties: {
    theme: { type: 'string', enum: ['light', 'dark', 'system'] },
    defaultView: { type: 'string', enum: ['grid', 'list', 'compact'] },
    autoFetch: { type: 'boolean' },
    syncInterval: { type: 'number' },
    notifications: { type: 'boolean' },
    language: { type: 'string' },
  },
};

export const settingsModule: RSModule = {
  name: 'settings',
  builder: (privateClient) => {
    // Declare the settings type
    privateClient.declareType('settings', settingsSchema);

    const SETTINGS_PATH = 'settings/app';

    // Get settings (offline-first: maxAge=false, gracefully handles non-existent settings)
    const get = async (): Promise<AppSettings> => {
      try {
        // Use getListing with maxAge=false to check if file exists (avoids network requests)
        const listing = await privateClient.getListing('settings/', false) as Record<string, unknown> | undefined;
        if (!listing || !('app' in listing)) {
          // Settings don't exist yet, return defaults
          return defaultSettings;
        }
        
        // maxAge=false = always return from local cache
        const settings = await privateClient.getObject(SETTINGS_PATH, false);
        if (!settings) {
          return defaultSettings;
        }
        return { ...defaultSettings, ...(settings as Partial<AppSettings>) };
      } catch {
        return defaultSettings;
      }
    };

    // Update settings
    const update = async (updates: Partial<AppSettings>): Promise<AppSettings> => {
      const current = await get();
      const updated: AppSettings = {
        ...current,
        ...updates,
      };
      await privateClient.storeObject('settings', SETTINGS_PATH, updated);
      return updated;
    };

    // Reset settings to defaults
    const reset = async (): Promise<AppSettings> => {
      await privateClient.storeObject('settings', SETTINGS_PATH, defaultSettings);
      return defaultSettings;
    };

    // Get default settings
    const getDefaults = (): AppSettings => defaultSettings;

    // Listen to changes
    const onChange = (callback: (event: unknown) => void) => {
      privateClient.on('change', callback);
      return () => (privateClient as any).removeEventListener('change', callback);
    };

    return {
      exports: {
        get,
        update,
        reset,
        getDefaults,
        onChange,
      },
    };
  },
};
