/**
 * Home Page - Resource Library
 */

import { Component, onMount } from 'solid-js';
import { useSearchParams } from '@solidjs/router';
import { ResourceList } from '../components/resources';
import { useApp } from '../contexts/AppContext';

const Home: Component = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const app = useApp();

  // Handle PWA shortcut ?action=add
  onMount(() => {
    if (searchParams.action === 'add') {
      app.setShowAddModal(true);
      // Clear the action param
      setSearchParams({ action: undefined });
    }
  });

  return (
    <div>
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
          My Library
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mt-1">
          All your saved resources in one place
        </p>
      </div>

      <ResourceList
        onAddClick={() => app.setShowAddModal(true)}
        onEditResource={(resource) => {
          console.log('Edit resource:', resource);
        }}
        onDeleteResource={(resource) => {
          console.log('Delete resource:', resource);
        }}
      />
    </div>
  );
};

export default Home;
