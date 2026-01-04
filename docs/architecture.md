# Architecture Overview

Zikra follows a layered architecture where each layer has a specific responsibility:

```
┌─────────────────────────────────────────────────────────────┐
│                     UI Components                           │
│              (SolidJS components in src/pages/)             │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    SolidJS Stores                           │
│              (src/lib/stores/*.ts)                          │
│                                                             │
│  • createStore() for reactive state                         │
│  • Wraps RemoteStorage modules                              │
│  • Handles loading/error states                             │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│               RemoteStorage Modules                          │
│              (src/lib/storage/modules/*.ts)                  │
│                                                              │
│  • resources.ts - CRUD for resources                         │
│  • categories.ts - CRUD for categories                       │
│  • topics.ts - CRUD for topics                               │
│  • settings.ts - User settings                               │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                RemoteStorage Core                            │
│              (src/lib/storage/index.ts)                      │
│                                                              │
│  • Single RemoteStorage instance                             │
│  • Module registration                                       │
│  • Caching configuration                                     │
│  • Event handling                                            │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  Storage Backends                            │
│                                                              │
│  ┌───────────────┐              ┌────────────────────┐       │
│  │  IndexedDB    │◄────────────►│  Remote Server     │       │
│  │  (Local)      │    sync      │  (remoteStorage)   │       │
│  └───────────────┘              └────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

## File Structure

```
src/
├── index.tsx              # App entry point
├── app.tsx                # Root component, widget setup
├── routes.ts              # SolidJS Router config
├── index.css              # Tailwind v4 imports
│
├── contexts/
│   └── AppContext.tsx     # Global app context + initialization
│
├── lib/
│   ├── storage/
│   │   ├── index.ts       # RemoteStorage instance + config
│   │   └── modules/
│   │       ├── resources.ts
│   │       ├── categories.ts
│   │       ├── topics.ts
│   │       └── settings.ts
│   │
│   ├── stores/
│   │   ├── index.ts       # Main store exports
│   │   ├── resources.ts   # SolidJS store for resources
│   │   ├── categories.ts  # SolidJS store for categories
│   │   ├── topics.ts      # SolidJS store for topics
│   │   └── settings.ts    # SolidJS store for settings
│   │
│   ├── detection/
│   │   ├── index.ts       # Resource type detection
│   │   └── fetcher.ts     # Metadata fetching
│   │
│   └── types/
│       └── index.ts       # TypeScript type definitions
│
└── pages/
    ├── home.tsx           # Main resource list
    ├── settings.tsx       # Settings page
    └── ...
```

## Data Flow

### Reading Data

```
Component                SolidJS Store              RemoteStorage
    │                        │                           │
    │   Use signal           │                           │
    ├───────────────────────►│                           │
    │                        │   getAll(maxAge: false)   │
    │                        ├──────────────────────────►│
    │                        │                           │
    │                        │   Return from IndexedDB   │
    │                        │◄──────────────────────────┤
    │   Reactive update      │                           │
    │◄───────────────────────┤                           │
    │                        │                           │
```

Key point: `maxAge: false` ensures reads **always** come from local cache.

### Writing Data

```
Component                SolidJS Store              RemoteStorage
    │                        │                           │
    │   Call action          │                           │
    │   (e.g., addResource)  │                           │
    ├───────────────────────►│                           │
    │                        │   storeObject()           │
    │                        ├──────────────────────────►│
    │                        │                           │
    │                        │   (writes to IndexedDB)   │
    │                        │   (emits 'change' event)  │
    │                        │                           │
    │   Store updates        │                           │
    │   via change event     │                           │
    │◄───────────────────────┤                           │
    │                        │                           │
    │                        │   (background sync if     │
    │                        │    connected)             │
    │                        │                           │
```

### Sync Flow

```
                         RemoteStorage
                              │
                              │ (when connected)
                              ▼
┌─────────────────────────────────────────────────────────┐
│                    Sync Process                          │
│                                                          │
│  1. Compare local revisions with remote                  │
│  2. Push local changes to remote                         │
│  3. Pull remote changes to local                         │
│  4. Emit 'sync-done' event                              │
│  5. Emit 'change' events for each changed item          │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
                    SolidJS Stores
                    (update via change events)
```

## Module Registration

RemoteStorage uses a module pattern for organizing data:

```typescript
// Register module
remoteStorage.addModule(resourcesModule);

// Claim access
remoteStorage.access.claim('resources', 'rw');

// Enable caching
remoteStorage.caching.enable('/resources/');

// Use via accessor
remoteStorage.resources.add({ ... });
```

Each module defines:
- **name**: Module identifier (e.g., 'resources')
- **builder**: Function that receives `privateClient` and returns API methods
- **schema**: Optional JSON Schema for data validation
