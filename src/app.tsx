/**
 * Zikra - Resource Collection App
 * Main application wrapper with layout and providers
 */

import { Suspense, type Component, type JSX } from 'solid-js';
import { AppProvider, useApp } from './contexts/AppContext';
import { Layout } from './components/layout';

// Loading spinner component
const LoadingSpinner: Component = () => (
  <div class="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
    <div class="flex flex-col items-center gap-4">
      <div class="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <p class="text-gray-600 dark:text-gray-400">Loading Zikra...</p>
    </div>
  </div>
);

// Inner app component that uses the app context
const AppContent: Component<{ children: JSX.Element }> = (props) => {
  const { isReady } = useApp();

  return (
    <>
      {!isReady() ? (
        <LoadingSpinner />
      ) : (
        <Layout>
          <Suspense fallback={<LoadingSpinner />}>
            {props.children}
          </Suspense>
        </Layout>
      )}
    </>
  );
};

// Main App wrapper with providers
const App: Component<{ children: JSX.Element }> = (props) => {
  return (
    <AppProvider>
      <AppContent>{props.children}</AppContent>
    </AppProvider>
  );
};

export default App;
