/**
 * Share Target Handler
 * Handles incoming shares from the Web Share Target API
 */

import { Component, createSignal, onMount, Show } from 'solid-js';
import { useNavigate, useSearchParams } from '@solidjs/router';
import { useApp } from '../contexts/AppContext';
import { resourceService } from '../lib/services/resource';
import { Button } from '../components/ui';
import { CheckIcon, XIcon, LoaderIcon } from '../components/ui/icons';

type ShareState = 'loading' | 'success' | 'error';

const ShareTarget: Component = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const app = useApp();
  
  const [state, setState] = createSignal<ShareState>('loading');
  const [error, setError] = createSignal<string>('');
  const [resourceTitle, setResourceTitle] = createSignal<string>('');

  onMount(async () => {
    // Wait for app to be ready with timeout
    const waitForReady = (): Promise<void> => {
      return new Promise((resolve, reject) => {
        // Check immediately
        if (app.isReady() && app.store) {
          resolve();
          return;
        }
        
        const timeout = setTimeout(() => {
          clearInterval(checkReady);
          reject(new Error('App initialization timed out'));
        }, 10000); // 10 second timeout
        
        const checkReady = setInterval(() => {
          if (app.isReady() && app.store) {
            clearInterval(checkReady);
            clearTimeout(timeout);
            resolve();
          }
        }, 100);
      });
    };

    try {
      await waitForReady();
      await processShare();
    } catch (err) {
      console.error('Share target initialization error:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize app');
      setState('error');
    }
  });

  const processShare = async () => {
    try {
      // Get shared data from URL params
      const urlParam = searchParams.url;
      const textParam = searchParams.text;
      const titleParam = searchParams.title;
      
      // Handle both string and array (take first if array)
      const url = Array.isArray(urlParam) ? urlParam[0] : urlParam;
      const text = Array.isArray(textParam) ? textParam[0] : textParam;
      const title = Array.isArray(titleParam) ? titleParam[0] : titleParam;
      
      const input = url || text || '';
      
      if (!input) {
        throw new Error('No URL or text shared');
      }

      // Try to extract URL from text if needed
      let resourceUrl = input;
      const urlMatch = input.match(/(https?:\/\/[^\s]+)/);
      if (urlMatch) {
        resourceUrl = urlMatch[1];
      }

      // Add the resource
      const resource = await resourceService.addResourceAuto(resourceUrl, app.store!);
      
      setResourceTitle(resource.title || title || resourceUrl);
      setState('success');
      
      // Auto-redirect after 2 seconds
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 2000);
      
    } catch (err) {
      console.error('Share target error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save resource');
      setState('error');
    }
  };

  const goHome = () => {
    navigate('/', { replace: true });
  };

  return (
    <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <Show when={state() === 'loading'}>
          <div class="flex flex-col items-center gap-4">
            <div class="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <LoaderIcon class="w-8 h-8 text-blue-500" />
            </div>
            <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Saving Resource
            </h1>
            <p class="text-gray-600 dark:text-gray-400">
              Adding to your library...
            </p>
          </div>
        </Show>

        <Show when={state() === 'success'}>
          <div class="flex flex-col items-center gap-4">
            <div class="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckIcon class="w-8 h-8 text-green-500" />
            </div>
            <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Saved!
            </h1>
            <p class="text-gray-600 dark:text-gray-400">
              "{resourceTitle()}" has been added to your library.
            </p>
            <p class="text-sm text-gray-500 dark:text-gray-500">
              Redirecting to home...
            </p>
            <Button variant="ghost" onClick={goHome}>
              Go to Library
            </Button>
          </div>
        </Show>

        <Show when={state() === 'error'}>
          <div class="flex flex-col items-center gap-4">
            <div class="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <XIcon class="w-8 h-8 text-red-500" />
            </div>
            <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Oops!
            </h1>
            <p class="text-gray-600 dark:text-gray-400">
              {error() || 'Something went wrong.'}
            </p>
            <Button onClick={goHome}>
              Go to Library
            </Button>
          </div>
        </Show>
      </div>
    </div>
  );
};

export default ShareTarget;
