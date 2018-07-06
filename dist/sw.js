/***********
 * Service Worker operations
 *
 * Adapted from:
 * https://developers.google.com/web/fundamentals/primers/service-workers/
 *********/

const currentCacheName = 'restaurants-cache-v1';

// Cache install

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(currentCacheName)
      .then(function(cache) {
        console.log('Cache successfully opened: ', currentCacheName);
        return cache.addAll([
          '/',
          'index.html',
          'restaurant.html',
          'config.js',
          'css/index.css',
          'css/restaurant.css',
          'js/index.js',
          'js/restaurant.js',
          'img/',
          'img_converted/'
        ]);
      })
  );
});

// Cleanup old caches at activation

self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.filter(function(cacheName) {
                    return cacheName.startsWith('restaurants-') && cacheName != currentCacheName;
                }).map(function(cacheName) {
                    console.log("Deleting cache: ", cacheName);
                    return caches.delete(cacheName);
                })
            );
        })
    );
});

// Serve requests from the cache

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        if (response) {
          // console.log("Cache hit - returning response: ", response);
          return response;
        }
        return fetch(event.request).then(function(response) {
          // console.log("Adding to cache: ", response);
          let responseCopy = response.clone();
          caches.open(currentCacheName).then(function(cache) {
            cache.put(event.request, responseCopy);
          });
          return response;
        });
      }
    )
  );
});
