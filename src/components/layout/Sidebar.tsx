/**
 * Sidebar Component
 */

import { Component, Show, For, createSignal } from 'solid-js';
import { A, useLocation } from '@solidjs/router';
import { 
  selectCategoriesArray, 
  selectTopicsArray,
  selectActiveResources,
  selectFavoriteResources,
} from '../../lib/stores';
import { 
  FolderIcon, 
  HeartIcon, 
  TagIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  GridIcon,
  SettingsIcon,
  BookIcon,
  VideoIcon,
  FileTextIcon,
  GlobeIcon,
} from '../ui/icons';

export interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: Component<SidebarProps> = (props) => {
  const location = useLocation();
  const categories = selectCategoriesArray;
  const topics = selectTopicsArray;
  const resources = selectActiveResources;
  const favorites = selectFavoriteResources;

  const [expandedCategories, setExpandedCategories] = createSignal<Set<string>>(new Set());

  const toggleCategory = (id: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getTopicsForCategory = (categoryId: string) => {
    return topics().filter((t) => t.categoryIds.includes(categoryId));
  };

  const getResourceCountForCategory = (categoryId: string) => {
    return resources().filter((r) => r.categoryIds.includes(categoryId)).length;
  };

  const navItems = [
    { href: '/', label: 'All Resources', icon: GridIcon, count: resources().length },
    { href: '/favorites', label: 'Favorites', icon: HeartIcon, count: favorites().length },
    { href: '/videos', label: 'Videos', icon: VideoIcon },
    { href: '/books', label: 'Books', icon: BookIcon },
    { href: '/articles', label: 'Articles', icon: FileTextIcon },
    { href: '/webpages', label: 'Webpages', icon: GlobeIcon },
  ];

  return (
    <>
      {/* Backdrop for mobile */}
      <Show when={props.isOpen}>
        <div
          class="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={props.onClose}
        />
      </Show>

      {/* Sidebar */}
      <aside
        class={`
          fixed lg:sticky top-0 left-0 
          w-64 h-screen 
          bg-white dark:bg-gray-900 
          border-r border-gray-200 dark:border-gray-800
          transform transition-transform duration-200 ease-in-out
          z-50 lg:z-auto
          overflow-y-auto
          ${props.isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div class="p-4 space-y-6">
          {/* Logo (mobile only) */}
          <div class="lg:hidden flex items-center gap-2 pb-4 border-b border-gray-200 dark:border-gray-800">
            <span class="text-2xl">📚</span>
            <span class="font-bold text-xl text-gray-900 dark:text-gray-100">
              Zikra
            </span>
          </div>

          {/* Main Navigation */}
          <nav class="space-y-1">
            <For each={navItems}>
              {(item) => (
                <A
                  href={item.href}
                  onClick={props.onClose}
                  class={`
                    flex items-center gap-3 px-3 py-2 rounded-lg
                    text-sm font-medium transition-colors
                    ${location.pathname === item.href
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }
                  `}
                >
                  <item.icon size={18} />
                  <span class="flex-1">{item.label}</span>
                  <Show when={item.count !== undefined}>
                    <span class="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                      {item.count}
                    </span>
                  </Show>
                </A>
              )}
            </For>
          </nav>

          {/* Categories */}
          <div>
            <div class="flex items-center justify-between px-3 mb-2">
              <h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Categories
              </h3>
              <A
                href="/categories"
                class="text-xs text-blue-600 hover:text-blue-700"
              >
                Manage
              </A>
            </div>

            <div class="space-y-1">
              <For each={categories()} fallback={
                <p class="px-3 py-2 text-sm text-gray-500">No categories yet</p>
              }>
                {(category) => {
                  const categoryTopics = () => getTopicsForCategory(category.id);
                  const isExpanded = () => expandedCategories().has(category.id);

                  return (
                    <div>
                      <button
                        onClick={() => toggleCategory(category.id)}
                        class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        <Show
                          when={categoryTopics().length > 0}
                          fallback={<div class="w-4" />}
                        >
                          <Show when={isExpanded()} fallback={<ChevronRightIcon size={14} />}>
                            <ChevronDownIcon size={14} />
                          </Show>
                        </Show>
                        
                        <span
                          class="w-3 h-3 rounded-full flex-shrink-0"
                          style={{
                            'background-color': category.color || '#6B7280',
                          }}
                        />
                        
                        <span class="flex-1 text-left truncate">
                          {category.name}
                        </span>
                        
                        <span class="text-xs text-gray-400">
                          {getResourceCountForCategory(category.id)}
                        </span>
                      </button>

                      {/* Topics */}
                      <Show when={isExpanded() && categoryTopics().length > 0}>
                        <div class="ml-6 mt-1 space-y-1">
                          <For each={categoryTopics()}>
                            {(topic) => (
                              <A
                                href={`/topic/${topic.id}`}
                                onClick={props.onClose}
                                class="flex items-center gap-2 px-3 py-1.5 rounded text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                              >
                                <TagIcon size={12} />
                                <span class="truncate">{topic.name}</span>
                              </A>
                            )}
                          </For>
                        </div>
                      </Show>
                    </div>
                  );
                }}
              </For>
            </div>
          </div>

          {/* Settings Link */}
          <div class="pt-4 border-t border-gray-200 dark:border-gray-800">
            <A
              href="/settings"
              onClick={props.onClose}
              class={`
                flex items-center gap-3 px-3 py-2 rounded-lg
                text-sm font-medium transition-colors
                ${location.pathname === '/settings'
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }
              `}
            >
              <SettingsIcon size={18} />
              <span>Settings</span>
            </A>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
