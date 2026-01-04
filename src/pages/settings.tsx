/**
 * Settings Page
 * App configuration and RemoteStorage connection
 */

import { Component, createSignal, Show } from 'solid-js';
import { useApp } from '../contexts/AppContext';
import { Button, Input } from '../components/ui';
import { SettingsIcon, CloudIcon, CheckIcon, XIcon } from '../components/ui/icons';

const Settings: Component = () => {
  const app = useApp();
  const [corsProxy, setCorsProxy] = createSignal(
    app.store?.settings()?.corsProxyUrl || 'https://api.allorigins.win/raw?url='
  );
  const [isSaving, setIsSaving] = createSignal(false);

  const handleSaveSettings = async () => {
    if (!app.store) return;
    
    setIsSaving(true);
    try {
      await app.store.updateSettings({
        corsProxyUrl: corsProxy(),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConnect = () => {
    // RemoteStorage widget handles connection
    // This is just for showing manual instructions
  };

  return (
    <div class="max-w-2xl mx-auto">
      <div class="mb-8">
        <div class="flex items-center gap-3 mb-2">
          <SettingsIcon class="w-8 h-8 text-gray-600 dark:text-gray-400" />
          <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Settings
          </h1>
        </div>
        <p class="text-gray-600 dark:text-gray-400">
          Configure your Zikra experience
        </p>
      </div>

      {/* RemoteStorage Connection */}
      <section class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <div class="flex items-center gap-3 mb-4">
          <CloudIcon class="w-6 h-6 text-blue-500" />
          <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Cloud Sync
          </h2>
        </div>

        <div class="flex items-center gap-4 mb-4">
          <div class={`flex items-center gap-2 px-3 py-2 rounded-full text-sm ${
            app.isConnected()
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
          }`}>
            <Show when={app.isConnected()} fallback={<XIcon class="w-4 h-4" />}>
              <CheckIcon class="w-4 h-4" />
            </Show>
            {app.isConnected() ? 'Connected' : 'Not connected'}
          </div>
        </div>

        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Connect to a remoteStorage provider to sync your resources across devices.
          Your data is stored locally first and synced when connected.
        </p>

        <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <p class="text-sm text-blue-800 dark:text-blue-300">
            <strong>Tip:</strong> Use the widget in the bottom-left corner to connect 
            to a remoteStorage provider, Dropbox, or Google Drive.
          </p>
        </div>
      </section>

      {/* CORS Proxy Settings */}
      <section class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Network Settings
        </h2>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              CORS Proxy URL
            </label>
            <Input
              value={corsProxy()}
              onInput={(e) => setCorsProxy(e.currentTarget.value)}
              placeholder="https://api.allorigins.win/raw?url="
            />
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Used for fetching metadata from websites that don't allow direct access.
            </p>
          </div>

          <Button
            onClick={handleSaveSettings}
            loading={isSaving()}
          >
            Save Settings
          </Button>
        </div>
      </section>

      {/* Data Management */}
      <section class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Data Management
        </h2>

        <div class="space-y-4">
          <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div>
              <p class="font-medium text-gray-900 dark:text-gray-100">
                Resources
              </p>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {Object.keys(app.store?.resources()?.items || {}).length} items saved
              </p>
            </div>
          </div>

          <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div>
              <p class="font-medium text-gray-900 dark:text-gray-100">
                Categories
              </p>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {Object.keys(app.store?.categories()?.items || {}).length} categories
              </p>
            </div>
          </div>

          <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div>
              <p class="font-medium text-gray-900 dark:text-gray-100">
                Topics
              </p>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {Object.keys(app.store?.topics()?.items || {}).length} topics
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* About */}
      <section class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          About Zikra
        </h2>

        <p class="text-gray-600 dark:text-gray-400 mb-4">
          Zikra (ذكرى - "memory" in Arabic) is a local-first PWA for collecting 
          and organizing resources from across the internet.
        </p>

        <ul class="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <li>YouTube videos, shorts, playlists, and channels</li>
          <li>Books (via ISBN or title)</li>
          <li>Research papers (via DOI or title)</li>
          <li>Articles and webpages</li>
          <li>GitHub repositories</li>
          <li>And much more...</li>
        </ul>

        <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p class="text-xs text-gray-500 dark:text-gray-500">
            Built with SolidJS • remoteStorage • Tailwind CSS
          </p>
        </div>
      </section>
    </div>
  );
};

export default Settings;
