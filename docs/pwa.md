# PWA Features

Zikra is a full Progressive Web App with offline support, installability, and native-like features.

## Configuration

PWA functionality is provided by `vite-plugin-pwa`. Configuration is in `vite.config.ts`:

```typescript
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    solidPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Zikra - Resource Collector',
        short_name: 'Zikra',
        description: 'Collect and organize resources from the internet',
        theme_color: '#1e293b',
        background_color: '#0f172a',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        // Share target for receiving shared content
        share_target: {
          action: '/share-target',
          method: 'GET',
          params: {
            title: 'title',
            text: 'text',
            url: 'url'
          }
        }
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          // Cache images from external sources
          {
            urlPattern: /^https:\/\/.*\.(png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          },
          // Cache favicons
          {
            urlPattern: /favicon/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'favicons',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30
              }
            }
          }
        ]
      }
    })
  ]
});
```

## Features

### 1. Offline Support

The service worker precaches all app assets:

```
Precached:
├── index.html
├── assets/*.js
├── assets/*.css  
├── icons/*.png
└── fonts/*.woff2
```

Combined with RemoteStorage's IndexedDB caching, the app works fully offline.

### 2. Installability

Users can install Zikra as a native-like app:

- **Desktop**: Chrome/Edge show install button in address bar
- **Mobile**: "Add to Home Screen" in browser menu
- **Result**: App icon on home screen, opens without browser UI

### 3. Auto-Update

```typescript
registerType: 'autoUpdate'
```

When a new version is deployed:
1. Service worker detects new assets
2. Downloads in background
3. Activates on next load

For manual update control:

```typescript
import { useRegisterSW } from 'virtual:pwa-register/solid';

function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker
  } = useRegisterSW();

  return (
    <Show when={needRefresh()}>
      <div class="fixed bottom-4 right-4 p-4 bg-blue-600 rounded-lg">
        <p>New version available!</p>
        <button onClick={() => updateServiceWorker(true)}>
          Update Now
        </button>
      </div>
    </Show>
  );
}
```

### 4. Share Target

Users can share content to Zikra from other apps:

```json
{
  "share_target": {
    "action": "/share-target",
    "method": "GET",
    "params": {
      "title": "title",
      "text": "text", 
      "url": "url"
    }
  }
}
```

Handle in your route:

```typescript
// src/pages/share-target.tsx
import { useSearchParams } from '@solidjs/router';
import { addResource } from '@/lib/stores/resources';

function ShareTarget() {
  const [params] = useSearchParams();
  
  onMount(async () => {
    const url = params.url || extractUrl(params.text);
    
    if (url) {
      await addResource({
        url,
        title: params.title || url,
        type: 'link'
      });
      // Redirect to home
      navigate('/');
    }
  });
  
  return <div>Processing shared content...</div>;
}
```

### 5. Push Notifications (Optional)

If you want to add push notifications for sync status:

```typescript
// Request permission
const permission = await Notification.requestPermission();

if (permission === 'granted') {
  // Show notification when sync completes
  remoteStorage.on('sync-done', () => {
    new Notification('Zikra', {
      body: 'Sync completed',
      icon: '/pwa-192x192.png'
    });
  });
}
```

## Manifest Details

### Icons

Required icon sizes for various platforms:

| Size | Purpose |
|------|---------|
| 192x192 | Android home screen |
| 512x512 | Android splash screen |
| 180x180 | iOS home screen (apple-touch-icon) |
| 16x16, 32x32 | Favicon |

### Display Modes

| Mode | Description |
|------|-------------|
| `standalone` | No browser UI, native-like (recommended) |
| `fullscreen` | Completely full screen |
| `minimal-ui` | Minimal browser controls |
| `browser` | Normal browser tab |

### Theme Colors

```json
{
  "theme_color": "#1e293b",
  "background_color": "#0f172a"
}
```

- **theme_color**: Status bar color on mobile, title bar on desktop
- **background_color**: Splash screen background during load

## Testing PWA

### Chrome DevTools

1. Open DevTools → Application tab
2. Check "Service Workers" section
3. Check "Manifest" section
4. Use "Offline" checkbox to test offline

### Lighthouse Audit

1. Open DevTools → Lighthouse tab
2. Select "Progressive Web App" category
3. Run audit
4. Address any issues

### PWA Checklist

- [ ] HTTPS (required for Service Workers)
- [ ] Valid manifest.json
- [ ] Service Worker registered
- [ ] 192x192 and 512x512 icons
- [ ] Offline fallback works
- [ ] Add to Home Screen prompt appears
- [ ] Lighthouse PWA audit passes

## Debugging

### Check Service Worker Status

```javascript
// In console
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('SW state:', reg?.active?.state);
  console.log('SW scope:', reg?.scope);
});
```

### Force Update

```javascript
// In console
navigator.serviceWorker.getRegistration().then(reg => {
  reg.update();
});
```

### Clear Cache and Reinstall

```javascript
// In console
caches.keys().then(keys => {
  keys.forEach(key => caches.delete(key));
});
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => reg.unregister());
});
```

Then hard refresh (Ctrl+Shift+R).

## Integration with RemoteStorage

The PWA service worker handles **app assets** (HTML, JS, CSS).
RemoteStorage handles **user data** in IndexedDB.

Together they provide:
- ✅ App loads instantly (cached assets)
- ✅ User data available offline (IndexedDB)
- ✅ Changes sync when online (RemoteStorage)
- ✅ Installable native-like experience (PWA)
