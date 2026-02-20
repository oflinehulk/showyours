const CACHE_NAME = 'showyours-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Delete all old caches so stale assets are never served
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    ).then(() => clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Never intercept navigation requests — always go to network for fresh index.html
  if (event.request.mode === 'navigate') {
    return;
  }
  // Let API calls go through normally
  if (event.request.url.includes('/rest/') || event.request.url.includes('/auth/')) {
    return;
  }
});
