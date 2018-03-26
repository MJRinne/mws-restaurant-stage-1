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
      // Registration was successful
      console.log('ServiceWorker registration successful with scope: ', registration.scope);
    }, function(err) {
      // registration failed :(
      console.log('ServiceWorker registration failed: ', err);
    });
  });
}
