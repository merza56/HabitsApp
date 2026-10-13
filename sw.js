const CACHE_NAME = 'habits-app-v13';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './tools.html',
  './tool.html',
  './js/core/tools-data.js',
  './js/tool-page.js',
  './install.html',
  './download.html',
  './css/tokens.css',
  './css/theme.css',
  './css/layout.css',
  './css/components.css',
  './js/core/i18n.js',
  './js/core/statistics-engine.js',
  './js/core/event-bus.js',
  './js/core/plugin-system.js',
  './js/core/widget-registry.js',
  './js/core/drag-drop.js',
  './js/core/canvas-engine.js',
  './js/core/auth-manager.js',
  './js/core/tools-engine.js',
  './js/app.js',
  './manifest.json',
  './icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request).catch(() => caches.match('./index.html'));
    })
  );
});