/**
 * Home Page - Resource Library
 */

import { Component, createSignal, onMount } from 'solid-js';
import { useSearchParams } from '@solidjs/router';
import { ResourceList, AddResourceModal } from '../components/resources';

const Home: Component = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showAddModal, setShowAddModal] = createSignal(false);

  // Handle PWA shortcut ?action=add
  onMount(() => {
    if (searchParams.action === 'add') {
      setShowAddModal(true);
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
        onAddClick={() => setShowAddModal(true)}
        onEditResource={(resource) => {
          console.log('Edit resource:', resource);
        }}
        onDeleteResource={(resource) => {
          console.log('Delete resource:', resource);
        }}
      />

      <AddResourceModal
        open={showAddModal()}
        onClose={() => setShowAddModal(false)}
      />
    </div>
  );
};

export default Home;
