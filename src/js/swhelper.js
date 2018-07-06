/*****
 *
 * Service Worker management and helper keyCode
 *
 * Parts adapted from the samples at:
 * https://developers.google.com/web/fundamentals/primers/service-workers/
 **********/


/*
 * Service worker registration
 *
 */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js').then(function(registration) {
      console.log('ServiceWorker registration successful with scope: ', registration.scope);
    }, function(err) {
      console.log('ServiceWorker registration failed: ', err);
    });
  });
}
