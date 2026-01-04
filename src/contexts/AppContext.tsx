/**
 * App Context Provider
 * 
 * Provides app-wide state and initialization logic.
 * Implements offline-first architecture with background sync.
 */

import { 
  createContext, 
  useContext, 
  ParentComponent, 
  createSignal,
  onMount,
  onCleanup,
  createEffect,
  Accessor,
} from 'solid-js';
import { 
  initAllStores, 
  connectionState,
  settingsStore,
  resourcesStore,
  categoriesStore,
  topicsStore,
  resourceActions,
  categoryActions,
  topicActions,
  settingsActions,
} from '../lib/stores';
import { 
  remoteStorage, 
  triggerSync,
} from '../lib/storage';

interface AppStore {
  resources: Accessor<typeof resourcesStore>;
  categories: Accessor<typeof categoriesStore>;
  topics: Accessor<typeof topicsStore>;
  settings: Accessor<typeof settingsStore>;
  resourceActions: typeof resourceActions;
  categoryActions: typeof categoryActions;
  topicActions: typeof topicActions;
  updateSettings: typeof settingsActions.update;
}

interface AppContextValue {
  initialized: boolean;
  connecting: boolean;
  connected: boolean;
  syncing: boolean;
  online: boolean;
  userAddress: string | null;
  showAddModal: boolean;
  setShowAddModal: (show: boolean) => void;
  sharedUrl: string | null;
  openAddModalWithUrl: (url: string) => void;
  connect: (userAddress: string) => Promise<void>;
  disconnect: () => void;
  syncNow: () => void;
  // Aliases for backward compatibility
  isReady: () => boolean;
  isConnected: () => boolean;
  store: AppStore | null;
}

const AppContext = createContext<AppContextValue>();

export const AppProvider: ParentComponent = (props) => {
  const [initialized, setInitialized] = createSignal(false);
  const [connecting, setConnecting] = createSignal(false);
  const [online, setOnline] = createSignal(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [showAddModal, setShowAddModal] = createSignal(false);
  const [sharedUrl, setSharedUrl] = createSignal<string | null>(null);

  // Open add modal with a pre-filled URL (used by share target)
  const openAddModalWithUrl = (url: string) => {
    setSharedUrl(url);
    setShowAddModal(true);
  };

  // Clear shared URL when modal closes
  const handleSetShowAddModal = (show: boolean) => {
    setShowAddModal(show);
    if (!show) {
      setSharedUrl(null);
    }
  };

  // Create store object
  const store: AppStore = {
    resources: () => resourcesStore,
    categories: () => categoriesStore,
    topics: () => topicsStore,
    settings: () => settingsStore,
    resourceActions,
    categoryActions,
    topicActions,
    updateSettings: settingsActions.update,
  };

  onMount(async () => {
    // Set up online/offline listeners
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initialize all stores from local cache (this is fast, no network required)
    // The app is immediately usable after this, even offline
    await initAllStores();
    setInitialized(true);

    // Apply theme
    applyTheme(settingsStore.theme);

    // RemoteStorage handles its own sync automatically when connected
    // No need to manually start/stop sync here

    // Cleanup on unmount
    onCleanup(() => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    });
  });

  // Watch for theme changes
  createEffect(() => {
    if (initialized()) {
      applyTheme(settingsStore.theme);
    }
  });

  const connect = async (userAddress: string) => {
    setConnecting(true);
    try {
      await remoteStorage.connect(userAddress);
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = () => {
    remoteStorage.disconnect();
  };

  // Manual sync trigger
  const syncNow = () => {
    triggerSync();
  };

  const value: AppContextValue = {
    get initialized() { return initialized(); },
    get connecting() { return connecting(); },
    get connected() { return connectionState().connected; },
    get syncing() { return connectionState().syncing; },
    get online() { return online(); },
    get userAddress() { return connectionState().userAddress; },
    get showAddModal() { return showAddModal(); },
    setShowAddModal: handleSetShowAddModal,
    get sharedUrl() { return sharedUrl(); },
    openAddModalWithUrl,
    connect,
    disconnect,
    syncNow,
    // Aliases
    isReady: () => initialized(),
    isConnected: () => connectionState().connected,
    get store() { return initialized() ? store : null; },
  };

  return (
    <AppContext.Provider value={value}>
      {props.children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}

function applyTheme(theme: 'light' | 'dark' | 'system') {
  const root = document.documentElement;
  
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
  } else {
    root.classList.toggle('dark', theme === 'dark');
  }
}

export default AppProvider;
