/**
 * Header Component
 */

import { Component, Show, createSignal } from 'solid-js';
import { A, useLocation } from '@solidjs/router';
import { useApp } from '../../contexts/AppContext';
import { connectionState } from '../../lib/stores';
import { remoteStorage } from '../../lib/storage';
import { Button, Modal, Input } from '../ui';
import { 
  MenuIcon, 
  CloudIcon, 
  CloudOffIcon, 
  SyncIcon,
  SettingsIcon,
  PlusIcon,
} from '../ui/icons';
import { SyncStatus } from './SyncStatus';

export interface HeaderProps {
  onMenuClick?: () => void;
  onAddClick?: () => void;
}

export const Header: Component<HeaderProps> = (props) => {
  const location = useLocation();
  const app = useApp();
  
  const [showConnectModal, setShowConnectModal] = createSignal(false);
  const [userAddress, setUserAddress] = createSignal('');
  const [connecting, setConnecting] = createSignal(false);

  const conn = connectionState;

  const handleConnect = async () => {
    const address = userAddress().trim();
    if (!address) return;

    setConnecting(true);
    try {
      await remoteStorage.connect(address);
      setShowConnectModal(false);
      setUserAddress('');
    } catch (error) {
      console.error('Connection failed:', error);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = () => {
    remoteStorage.disconnect();
  };

  return (
    <>
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
              {/* Sync Status - always visible */}
              <SyncStatus compact />

              {/* Connect/Disconnect */}
              <Show
                when={conn().connected}
                fallback={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowConnectModal(true)}
                    icon={<CloudIcon size={16} />}
                  >
                    <span class="hidden sm:inline">Connect</span>
                  </Button>
                }
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDisconnect}
                  class="text-gray-500 hover:text-red-500"
                >
                  Disconnect
                </Button>
              </Show>

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

      {/* Connect Modal */}
      <Modal
        open={showConnectModal()}
        onClose={() => setShowConnectModal(false)}
        title="Connect to remoteStorage"
        size="sm"
      >
        <div class="space-y-4">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Enter your remoteStorage user address to sync your data across devices.
          </p>
          
          <Input
            label="User Address"
            placeholder="user@provider.com"
            value={userAddress()}
            onInput={(e) => setUserAddress(e.currentTarget.value)}
            fullWidth
            hint="Example: user@5apps.com"
          />

          <div class="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowConnectModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConnect}
              loading={connecting()}
              disabled={!userAddress().trim()}
            >
              Connect
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default Header;
