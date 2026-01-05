import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import devtools from "solid-devtools/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/zikra/",
  plugins: [
    devtools(),
    solidPlugin(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["favicon.ico", "icons/*.png", "screenshots/*.png"],
      manifest: {
        name: "Zikra - Resource Library",
        short_name: "Zikra",
        description:
          "A local-first PWA for collecting and organizing resources from across the internet",
        start_url: "/zikra/",
        display: "standalone",
        background_color: "#1f2937",
        theme_color: "#3b82f6",
        orientation: "any",
        scope: "/zikra/",
        icons: [
          {
            src: "/zikra/icons/icon-72x72.png",
            sizes: "72x72",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/zikra/icons/icon-96x96.png",
            sizes: "96x96",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/zikra/icons/icon-128x128.png",
            sizes: "128x128",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/zikra/icons/icon-144x144.png",
            sizes: "144x144",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/zikra/icons/icon-152x152.png",
            sizes: "152x152",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/zikra/icons/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/zikra/icons/icon-384x384.png",
            sizes: "384x384",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/zikra/icons/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
        share_target: {
          action: "/zikra/share-target",
          method: "GET",
          params: {
            title: "title",
            text: "text",
            url: "url",
          },
        },
        categories: ["productivity", "utilities", "education"],
        shortcuts: [
          {
            name: "Add Resource",
            short_name: "Add",
            description: "Add a new resource to your library",
            url: "/zikra/?action=add",
            icons: [
              {
                src: "/zikra/icons/add-96x96.png",
                sizes: "96x96",
                type: "image/png",
              },
            ],
          },
          {
            name: "Settings",
            short_name: "Settings",
            description: "Open app settings",
            url: "/zikra/settings",
            icons: [
              {
                src: "/zikra/icons/settings-96x96.png",
                sizes: "96x96",
                type: "image/png",
              },
            ],
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.allorigins\.win\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "cors-proxy-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/noembed\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "oembed-cache",
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/openlibrary\.org\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "openlibrary-cache",
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/covers\.openlibrary\.org\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "book-covers-cache",
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/api\.crossref\.org\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "crossref-cache",
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/i\.ytimg\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "youtube-thumbnails-cache",
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  server: {
    port: 3000,
  },
  build: {
    target: "esnext",
  },
});
