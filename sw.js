/***********
 * Service Worker operations
 *
 * Adapted from:
 * https://developers.google.com/web/fundamentals/primers/service-workers/
 *********/

var currentCacheName = 'restaurants-cache-v1';

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
          'css/styles.css',
          'js/dbhelper.js',
          'js/swhelper.js',
          'js/main.js',
          'js/restaurant_info.js',
          'img/',
          'img_converted/',
          'data/restaurants.json',
          'restaurant.html?id=1',
          'restaurant.html?id=2',
          'restaurant.html?id=3',
          'restaurant.html?id=4',
          'restaurant.html?id=5',
          'restaurant.html?id=6',
          'restaurant.html?id=7',
          'restaurant.html?id=8',
          'restaurant.html?id=9',
          'restaurant.html?id=10']);
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
          console.log("Cache hit - returning response: ", response);
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});
