/**
 * Main Layout Component
 */

import { Component, JSX, createSignal, Show } from 'solid-js';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { AddResourceModal } from '../resources/AddResourceModal';
import { useApp } from '../../contexts/AppContext';
import { LoaderIcon } from '../ui/icons';

export interface LayoutProps {
  children: JSX.Element;
}

export const Layout: Component<LayoutProps> = (props) => {
  const app = useApp();
  const [sidebarOpen, setSidebarOpen] = createSignal(false);

  return (
    <Show
      when={app.initialized}
      fallback={
        <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div class="text-center">
            <LoaderIcon size={48} class="mx-auto mb-4 text-blue-500" />
            <p class="text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      }
    >
      <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header
          onMenuClick={() => setSidebarOpen(true)}
        />

        <div class="flex">
          <Sidebar
            isOpen={sidebarOpen()}
            onClose={() => setSidebarOpen(false)}
          />

          <main class="flex-1 min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8">
            <div class="max-w-7xl mx-auto">
              {props.children}
            </div>
          </main>
        </div>

        <AddResourceModal
          open={app.showAddModal}
          onClose={() => app.setShowAddModal(false)}
          initialUrl={app.sharedUrl || undefined}
        />
      </div>
    </Show>
  );
};

export default Layout;
