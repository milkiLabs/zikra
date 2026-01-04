/**
 * Share Target Handler
 * Handles incoming shares from the Web Share Target API
 */

import { Component, onMount } from 'solid-js';
import { useNavigate, useSearchParams } from '@solidjs/router';
import { useApp } from '../contexts/AppContext';

const ShareTarget: Component = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const app = useApp();

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
      
      // Get shared data from URL params
      const urlParam = searchParams.url;
      const textParam = searchParams.text;
      
      // Handle both string and array (take first if array)
      const url = Array.isArray(urlParam) ? urlParam[0] : urlParam;
      const text = Array.isArray(textParam) ? textParam[0] : textParam;
      
      const input = url || text || '';
      
      if (input) {
        // Try to extract URL from text if needed
        let resourceUrl = input;
        const urlMatch = input.match(/(https?:\/\/[^\s]+)/);
        if (urlMatch) {
          resourceUrl = urlMatch[1];
        }
        
        // Open the add modal with the shared URL pre-filled
        app.openAddModalWithUrl(resourceUrl);
      }
      
      // Navigate to home
      navigate('/', { replace: true });
      
    } catch (err) {
      console.error('Share target error:', err);
      // Navigate to home even on error
      navigate('/', { replace: true });
    }
  });

  // Show nothing while processing - will redirect immediately
  return null;
};

export default ShareTarget;
