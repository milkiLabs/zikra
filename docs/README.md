# Zikra Documentation

Zikra (ذكرى - Arabic for "memory" or "remembrance") is a local-first Progressive Web App for collecting and organizing internet resources. It combines SolidJS for reactive UI, RemoteStorage for offline-first data persistence and sync, and Tailwind CSS v4 for styling.

## Table of Contents

1. [Architecture Overview](./architecture.md)
2. [RemoteStorage Integration](./remotestorage-integration.md)
3. [SolidJS Store Bridge](./solidjs-store-bridge.md)
4. [Offline-First Design](./offline-first.md)
5. [PWA Features](./pwa.md)

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Core Concepts

### Local-First Architecture

Zikra is designed with a "local-first" philosophy:

1. **All reads are from local cache** - No network requests for reading data
2. **All writes go to local cache first** - Immediate UI feedback
3. **Sync happens in the background** - When online, changes sync transparently
4. **Works completely offline** - The app functions fully without internet

### Data Model

- **Resources**: URLs, articles, videos, images, and other web content
- **Categories**: Organizational buckets for resources
- **Topics**: Tags/labels that cut across categories
- **Settings**: User preferences and app configuration

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| UI Framework | SolidJS 1.9.5 | Reactive, fine-grained UI updates |
| Data Layer | RemoteStorage.js 2.0.0-beta.8 | Offline-first storage + sync |
| Styling | Tailwind CSS v4 | Utility-first CSS |
| PWA | vite-plugin-pwa | Service worker, manifest |
| Build | Vite 7 | Fast development and builds |
