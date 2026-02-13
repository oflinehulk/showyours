const CACHE_NAME = 'showyours-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Network-first strategy for API calls, cache-first for assets
  if (event.request.url.includes('/rest/') || event.request.url.includes('/auth/')) {
    return; // Let API calls go through normally
  }
});
