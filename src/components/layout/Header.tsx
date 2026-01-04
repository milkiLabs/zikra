/**
 * Header Component
 * 
 * Clean header with navigation, SyncWidget, and add button.
 * The SyncWidget now handles all sync/connection logic.
 */

import { Component } from 'solid-js';
import { A, useLocation } from '@solidjs/router';
import { Button } from '../ui';
import { MenuIcon, PlusIcon } from '../ui/icons';
import { SyncWidget } from './SyncWidget';

export interface HeaderProps {
  onMenuClick?: () => void;
  onAddClick?: () => void;
}

export const Header: Component<HeaderProps> = (props) => {
  const location = useLocation();

  return (
    <header class="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          {/* Left */}
          <div class="flex items-center gap-4">
            <button
              onClick={props.onMenuClick}
              class="lg:hidden p-2 -ml-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <MenuIcon size={24} />
            </button>
            
            <A href="/" class="flex items-center gap-2">
              <span class="text-2xl">📚</span>
              <span class="font-bold text-xl text-gray-900 dark:text-gray-100">
                Zikra
              </span>
            </A>
          </div>

          {/* Center - Navigation */}
          <nav class="hidden md:flex items-center gap-1">
            <A
              href="/"
              class={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === '/'
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              Library
            </A>
            <A
              href="/categories"
              class={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === '/categories'
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              Categories
            </A>
            <A
              href="/settings"
              class={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === '/settings'
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              Settings
            </A>
          </nav>

          {/* Right */}
          <div class="flex items-center gap-2">
            {/* Sync Widget - handles all sync/connection UI */}
            <SyncWidget />

            {/* Add Resource Button */}
            <Button
              onClick={props.onAddClick}
              size="sm"
              icon={<PlusIcon size={18} />}
              class="hidden sm:flex"
            >
              Add
            </Button>
            
            {/* Mobile Add Button */}
            <button
              onClick={props.onAddClick}
              class="sm:hidden p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <PlusIcon size={20} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
