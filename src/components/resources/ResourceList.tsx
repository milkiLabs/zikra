/**
 * Resource List Component
 * 
 * Displays a list of resources with filtering and sorting.
 */

import { 
  Component, 
  createSignal, 
  createMemo, 
  For, 
  Show,
  createEffect,
} from 'solid-js';
import type { Resource, ResourceFilter, ResourceType } from '../../types';
import { 
  filterResources, 
  selectCategoriesArray, 
  selectTopicsArray 
} from '../../lib/stores';
import { ResourceCard } from './ResourceCard';
import { Input, Select, Button, Badge } from '../ui';
import { 
  SearchIcon, 
  FilterIcon, 
  GridIcon, 
  ListIcon,
  PlusIcon,
  XIcon,
} from '../ui/icons';
import { getResourceTypeName, getResourceTypeIcon } from '../../lib/detection/detector';

const RESOURCE_TYPES: ResourceType[] = [
  'youtube-video',
  'youtube-short',
  'youtube-playlist',
  'youtube-channel',
  'book',
  'research-paper',
  'article',
  'webpage',
  'podcast',
  'podcast-episode',
  'twitter-thread',
  'github-repo',
  'custom',
];

export interface ResourceListProps {
  onAddClick?: () => void;
  onEditResource?: (resource: Resource) => void;
  onDeleteResource?: (resource: Resource) => void;
}

export const ResourceList: Component<ResourceListProps> = (props) => {
  // View state
  const [view, setView] = createSignal<'grid' | 'list' | 'compact'>('grid');
  const [showFilters, setShowFilters] = createSignal(false);

  // Filter state
  const [search, setSearch] = createSignal('');
  const [selectedTypes, setSelectedTypes] = createSignal<ResourceType[]>([]);
  const [selectedCategories, setSelectedCategories] = createSignal<string[]>([]);
  const [selectedTopics, setSelectedTopics] = createSignal<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = createSignal(false);
  const [sortBy, setSortBy] = createSignal<'createdAt' | 'updatedAt' | 'title'>('createdAt');
  const [sortOrder, setSortOrder] = createSignal<'asc' | 'desc'>('desc');

  // Data
  const categories = selectCategoriesArray;
  const topics = selectTopicsArray;

  // Build filter
  const filter = createMemo<ResourceFilter>(() => ({
    search: search() || undefined,
    types: selectedTypes().length > 0 ? selectedTypes() : undefined,
    categoryIds: selectedCategories().length > 0 ? selectedCategories() : undefined,
    topicIds: selectedTopics().length > 0 ? selectedTopics() : undefined,
    isFavorite: showFavoritesOnly() ? true : undefined,
    status: ['active'], // Only show active resources
    sortBy: sortBy(),
    sortOrder: sortOrder(),
  }));

  // Filtered resources
  const filteredResources = createMemo(() => filterResources(filter()));

  // Active filter count
  const activeFilterCount = createMemo(() => {
    let count = 0;
    if (selectedTypes().length > 0) count++;
    if (selectedCategories().length > 0) count++;
    if (selectedTopics().length > 0) count++;
    if (showFavoritesOnly()) count++;
    return count;
  });

  // Clear all filters
  const clearFilters = () => {
    setSearch('');
    setSelectedTypes([]);
    setSelectedCategories([]);
    setSelectedTopics([]);
    setShowFavoritesOnly(false);
  };

  // Type options for select
  const typeOptions = RESOURCE_TYPES.map((t) => ({
    value: t,
    label: `${getResourceTypeIcon(t)} ${getResourceTypeName(t)}`,
  }));

  const categoryOptions = createMemo(() => 
    categories().map((c) => ({
      value: c.id,
      label: c.name,
      color: c.color,
    }))
  );

  const topicOptions = createMemo(() => 
    topics().map((t) => ({
      value: t.id,
      label: t.name,
      color: t.color,
    }))
  );

  const sortOptions = [
    { value: 'createdAt', label: 'Date Added' },
    { value: 'updatedAt', label: 'Date Modified' },
    { value: 'title', label: 'Title' },
  ];

  return (
    <div class="space-y-4">
      {/* Header */}
      <div class="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div class="flex-1">
          <Input
            placeholder="Search resources..."
            value={search()}
            onInput={(e) => setSearch(e.currentTarget.value)}
            icon={<SearchIcon size={18} />}
            clearable
            onClear={() => setSearch('')}
            fullWidth
          />
        </div>

        {/* Actions */}
        <div class="flex items-center gap-2">
          {/* Filter toggle */}
          <Button
            variant={showFilters() ? 'primary' : 'secondary'}
            onClick={() => setShowFilters(!showFilters())}
            icon={<FilterIcon size={18} />}
          >
            <span class="hidden sm:inline">Filters</span>
            <Show when={activeFilterCount() > 0}>
              <Badge size="sm" variant="primary">{activeFilterCount()}</Badge>
            </Show>
          </Button>

          {/* View toggle */}
          <div class="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <button
              onClick={() => setView('grid')}
              class={`p-2 ${view() === 'grid' ? 'bg-gray-100 dark:bg-gray-700' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
            >
              <GridIcon size={18} />
            </button>
            <button
              onClick={() => setView('list')}
              class={`p-2 ${view() === 'list' ? 'bg-gray-100 dark:bg-gray-700' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
            >
              <ListIcon size={18} />
            </button>
          </div>

          {/* Add button */}
          <Button onClick={props.onAddClick} icon={<PlusIcon size={18} />}>
            <span class="hidden sm:inline">Add</span>
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      <Show when={showFilters()}>
        <div class="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Type filter */}
            <Select
              label="Type"
              options={typeOptions}
              value={selectedTypes()}
              onChange={(v) => setSelectedTypes(v as ResourceType[])}
              multiple
              searchable
              placeholder="All types"
              fullWidth
            />

            {/* Category filter */}
            <Select
              label="Category"
              options={categoryOptions()}
              value={selectedCategories()}
              onChange={(v) => setSelectedCategories(v as string[])}
              multiple
              searchable
              placeholder="All categories"
              fullWidth
            />

            {/* Topic filter */}
            <Select
              label="Topic"
              options={topicOptions()}
              value={selectedTopics()}
              onChange={(v) => setSelectedTopics(v as string[])}
              multiple
              searchable
              placeholder="All topics"
              fullWidth
            />

            {/* Sort */}
            <Select
              label="Sort by"
              options={sortOptions}
              value={sortBy()}
              onChange={(v) => setSortBy(v as 'createdAt' | 'updatedAt' | 'title')}
              placeholder="Sort by"
              fullWidth
            />
          </div>

          <div class="flex items-center justify-between">
            {/* Favorites toggle */}
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showFavoritesOnly()}
                onChange={(e) => setShowFavoritesOnly(e.currentTarget.checked)}
                class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span class="text-sm text-gray-700 dark:text-gray-300">
                Favorites only
              </span>
            </label>

            {/* Clear filters */}
            <Show when={activeFilterCount() > 0}>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            </Show>
          </div>
        </div>
      </Show>

      {/* Results count */}
      <div class="text-sm text-gray-500 dark:text-gray-400">
        {filteredResources().length} resource{filteredResources().length !== 1 ? 's' : ''}
        <Show when={activeFilterCount() > 0 || search()}>
          <span> matching your filters</span>
        </Show>
      </div>

      {/* Resource Grid/List */}
      <Show
        when={filteredResources().length > 0}
        fallback={
          <div class="text-center py-12">
            <div class="text-4xl mb-4">📭</div>
            <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No resources found
            </h3>
            <p class="text-gray-500 dark:text-gray-400 mb-4">
              <Show 
                when={activeFilterCount() > 0 || search()}
                fallback="Start by adding your first resource"
              >
                Try adjusting your filters
              </Show>
            </p>
            <Show when={!activeFilterCount() && !search()}>
              <Button onClick={props.onAddClick} icon={<PlusIcon size={18} />}>
                Add Resource
              </Button>
            </Show>
          </div>
        }
      >
        <div
          class={
            view() === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
              : 'space-y-3'
          }
        >
          <For each={filteredResources()}>
            {(resource) => (
              <ResourceCard
                resource={resource}
                view={view()}
                onEdit={props.onEditResource}
                onDelete={props.onDeleteResource}
              />
            )}
          </For>
        </div>
      </Show>
    </div>
  );
};

export default ResourceList;
