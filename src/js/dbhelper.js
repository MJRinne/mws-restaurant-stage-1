/**********************
 * idb.js
 *
 * By Jake Archibald
 * https://github.com/jakearchibald/idb/blob/master/lib/idb.js
 **********************/

'use strict';

(function() {
  function toArray(arr) {
    return Array.prototype.slice.call(arr);
  }

  function promisifyRequest(request) {
    return new Promise(function(resolve, reject) {
      request.onsuccess = function() {
        resolve(request.result);
      };

      request.onerror = function() {
        reject(request.error);
      };
    });
  }

  function promisifyRequestCall(obj, method, args) {
    var request;
    var p = new Promise(function(resolve, reject) {
      request = obj[method].apply(obj, args);
      promisifyRequest(request).then(resolve, reject);
    });

    p.request = request;
    return p;
  }

  function promisifyCursorRequestCall(obj, method, args) {
    var p = promisifyRequestCall(obj, method, args);
    return p.then(function(value) {
      if (!value) return;
      return new Cursor(value, p.request);
    });
  }

  function proxyProperties(ProxyClass, targetProp, properties) {
    properties.forEach(function(prop) {
      Object.defineProperty(ProxyClass.prototype, prop, {
        get: function() {
          return this[targetProp][prop];
        },
        set: function(val) {
          this[targetProp][prop] = val;
        }
      });
    });
  }

  function proxyRequestMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function(prop) {
      if (!(prop in Constructor.prototype)) return;
      ProxyClass.prototype[prop] = function() {
        return promisifyRequestCall(this[targetProp], prop, arguments);
      };
    });
  }

  function proxyMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function(prop) {
      if (!(prop in Constructor.prototype)) return;
      ProxyClass.prototype[prop] = function() {
        return this[targetProp][prop].apply(this[targetProp], arguments);
      };
    });
  }

  function proxyCursorRequestMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function(prop) {
      if (!(prop in Constructor.prototype)) return;
      ProxyClass.prototype[prop] = function() {
        return promisifyCursorRequestCall(this[targetProp], prop, arguments);
      };
    });
  }

  function Index(index) {
    this._index = index;
  }

  proxyProperties(Index, '_index', [
    'name',
    'keyPath',
    'multiEntry',
    'unique'
  ]);

  proxyRequestMethods(Index, '_index', IDBIndex, [
    'get',
    'getKey',
    'getAll',
    'getAllKeys',
    'count'
  ]);

  proxyCursorRequestMethods(Index, '_index', IDBIndex, [
    'openCursor',
    'openKeyCursor'
  ]);

  function Cursor(cursor, request) {
    this._cursor = cursor;
    this._request = request;
  }

  proxyProperties(Cursor, '_cursor', [
    'direction',
    'key',
    'primaryKey',
    'value'
  ]);

  proxyRequestMethods(Cursor, '_cursor', IDBCursor, [
    'update',
    'delete'
  ]);

  // proxy 'next' methods
  ['advance', 'continue', 'continuePrimaryKey'].forEach(function(methodName) {
    if (!(methodName in IDBCursor.prototype)) return;
    Cursor.prototype[methodName] = function() {
      var cursor = this;
      var args = arguments;
      return Promise.resolve().then(function() {
        cursor._cursor[methodName].apply(cursor._cursor, args);
        return promisifyRequest(cursor._request).then(function(value) {
          if (!value) return;
          return new Cursor(value, cursor._request);
        });
      });
    };
  });

  function ObjectStore(store) {
    this._store = store;
  }

  ObjectStore.prototype.createIndex = function() {
    return new Index(this._store.createIndex.apply(this._store, arguments));
  };

  ObjectStore.prototype.index = function() {
    return new Index(this._store.index.apply(this._store, arguments));
  };

  proxyProperties(ObjectStore, '_store', [
    'name',
    'keyPath',
    'indexNames',
    'autoIncrement'
  ]);

  proxyRequestMethods(ObjectStore, '_store', IDBObjectStore, [
    'put',
    'add',
    'delete',
    'clear',
    'get',
    'getAll',
    'getKey',
    'getAllKeys',
    'count'
  ]);

  proxyCursorRequestMethods(ObjectStore, '_store', IDBObjectStore, [
    'openCursor',
    'openKeyCursor'
  ]);

  proxyMethods(ObjectStore, '_store', IDBObjectStore, [
    'deleteIndex'
  ]);

  function Transaction(idbTransaction) {
    this._tx = idbTransaction;
    this.complete = new Promise(function(resolve, reject) {
      idbTransaction.oncomplete = function() {
        resolve();
      };
      idbTransaction.onerror = function() {
        reject(idbTransaction.error);
      };
      idbTransaction.onabort = function() {
        reject(idbTransaction.error);
      };
    });
  }

  Transaction.prototype.objectStore = function() {
    return new ObjectStore(this._tx.objectStore.apply(this._tx, arguments));
  };

  proxyProperties(Transaction, '_tx', [
    'objectStoreNames',
    'mode'
  ]);

  proxyMethods(Transaction, '_tx', IDBTransaction, [
    'abort'
  ]);

  function UpgradeDB(db, oldVersion, transaction) {
    this._db = db;
    this.oldVersion = oldVersion;
    this.transaction = new Transaction(transaction);
  }

  UpgradeDB.prototype.createObjectStore = function() {
    return new ObjectStore(this._db.createObjectStore.apply(this._db, arguments));
  };

  proxyProperties(UpgradeDB, '_db', [
    'name',
    'version',
    'objectStoreNames'
  ]);

  proxyMethods(UpgradeDB, '_db', IDBDatabase, [
    'deleteObjectStore',
    'close'
  ]);

  function DB(db) {
    this._db = db;
  }

  DB.prototype.transaction = function() {
    return new Transaction(this._db.transaction.apply(this._db, arguments));
  };

  proxyProperties(DB, '_db', [
    'name',
    'version',
    'objectStoreNames'
  ]);

  proxyMethods(DB, '_db', IDBDatabase, [
    'close'
  ]);

  // Add cursor iterators
  // TODO: remove this once browsers do the right thing with promises
  ['openCursor', 'openKeyCursor'].forEach(function(funcName) {
    [ObjectStore, Index].forEach(function(Constructor) {
      Constructor.prototype[funcName.replace('open', 'iterate')] = function() {
        var args = toArray(arguments);
        var callback = args[args.length - 1];
        var nativeObject = this._store || this._index;
        var request = nativeObject[funcName].apply(nativeObject, args.slice(0, -1));
        request.onsuccess = function() {
          callback(request.result);
        };
      };
    });
  });

  // polyfill getAll
  [Index, ObjectStore].forEach(function(Constructor) {
    if (Constructor.prototype.getAll) return;
    Constructor.prototype.getAll = function(query, count) {
      var instance = this;
      var items = [];

      return new Promise(function(resolve) {
        instance.iterateCursor(query, function(cursor) {
          if (!cursor) {
            resolve(items);
            return;
          }
          items.push(cursor.value);

          if (count !== undefined && items.length == count) {
            resolve(items);
            return;
          }
          cursor.continue();
        });
      });
    };
  });

  var exp = {
    open: function(name, version, upgradeCallback) {
      var p = promisifyRequestCall(indexedDB, 'open', [name, version]);
      var request = p.request;

      request.onupgradeneeded = function(event) {
        if (upgradeCallback) {
          upgradeCallback(new UpgradeDB(request.result, event.oldVersion, request.transaction));
        }
      };

      return p.then(function(db) {
        return new DB(db);
      });
    },
    delete: function(name) {
      return promisifyRequestCall(indexedDB, 'deleteDatabase', [name]);
    }
  };

  if (typeof module !== 'undefined') {
    module.exports = exp;
  }
  else {
    self.idb = exp;
  }
}());



/****************************************************
 * DBHelper starts here
 *
 * Common database helper functions.
 *
 * IDB functions derived from "wittr/js/idb-test/index.js"
 * and https://github.com/jakearchibald/idb/blob/master/README.md
 * Both by Jake Archibald
 *****************************************************/

class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    // const port = 8000 // Change this to your server port
    // return `http://localhost:${port}/data/restaurants.json`;
    const port = 1337 // Change this to your server port
    return `http://localhost:${port}/restaurants`;
  }

  static openIDB() {
    return idb.open('restaurantIDB', 1, function (upgradeDb) {
      switch (upgradeDb.oldVersion) {
        case 0:
          const restaurantStore = upgradeDb.createObjectStore('restaurants', {
            keyPath: 'id'
          });
          const masterStore = upgradeDb.createObjectStore('master');
          const reviewStore = upgradeDb.createObjectStore('pendingreviews', {
            autoIncrement : true, keyPath: 'id'
          });
      }
    })
  }


  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {
    // Open or generate db
    const dbPromise = DBHelper.openIDB();
    // Check if all restaurants have already been saved
    dbPromise.then(function(db) {
      var tx = db.transaction('master');
      var keyValStore = tx.objectStore('master');
      return keyValStore.get('all_restaurants');
    }).then(function(val) {
      // console.log('The value of "all_restaurants" is:', val);
      if (val === undefined) { // Nope => get them
      let xhr = new XMLHttpRequest();
      xhr.open('GET', DBHelper.DATABASE_URL);
      xhr.onload = () => {
        if (xhr.status === 200) { // Got a success response from server!
          const restaurants = JSON.parse(xhr.responseText);
          dbPromise.then(db => {
            const tx = db.transaction('restaurants','readwrite');
            const restaurantStore = tx.objectStore('restaurants');
            restaurants.forEach(function (restaurant) {
              restaurantStore.put(restaurant);
            })
          });
          // Mark in IDB that all restaurants have been retrieved
          dbPromise.then(db => {
            const tx = db.transaction('master','readwrite');
            const masterStore = tx.objectStore('master');
            masterStore.put("saved", "all_restaurants");
          });
          callback(null, restaurants);
        } else { // Oops!. Got an error from server.
          const error = (`Request failed. Returned status of ${xhr.status}`);
          callback(error, null);
        }
      };
      xhr.send();
    } else { // Full set already in DB -> assemble from there
      dbPromise.then(db => {
        return db.transaction('restaurants')
          .objectStore('restaurants').getAll();
      }).then(allObjs => callback(null, allObjs));
    }
  }).catch(function(err) {
    console.log('all_restaurants not found, returned:', err)
  });

}

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // Open or generate db
    const dbPromise = DBHelper.openIDB();
    // console.log("DB open, about to fetch: ", id);
    // Try to get our restaurant from the db:
    dbPromise.then(db => {
      return db.transaction('restaurants')
        .objectStore('restaurants').get(parseInt(id));
    }).then(obj => {
      // console.log("get id from db returned: ", obj);
      if (obj === undefined) {
        // Failed to find restaurant {id} from the db => get it
        let xhr = new XMLHttpRequest();
        xhr.open('GET', DBHelper.DATABASE_URL + `/${id}`);
        xhr.onload = () => {
          if (xhr.status === 200) { // Got a success response from server!
            const restaurant = JSON.parse(xhr.responseText);
            // Get the reviews too:
            DBHelper.fetchReviewsFromServer(id, (error, reviews) => {
              if (reviews) {
                restaurant.reviews = reviews;
                // Save it to the db:
                dbPromise.then(db => {
                  const tx = db.transaction('restaurants','readwrite');
                  const restaurantStore = tx.objectStore('restaurants');
                  restaurantStore.put(restaurant);
                });
                callback(null, restaurant);
              }
              if (error) callback(error, null);
            });
          } else { // Oops!. Got an error from server.
            const error = (`Request failed. Returned status of ${xhr.status}`);
            callback(error, null);
          }
        };
        xhr.send();
      } else {
        // Does IDB have reviews for this restaurant?
        if (obj.reviews === undefined) {
          DBHelper.fetchReviewsFromServer(id, (error, reviews) => {
            if (reviews) {
              // console.log("Fetched reviews: ", reviews);
              obj.reviews = reviews;
              // Save restaurant with reviews to IDB:
              dbPromise.then(db => {
                const tx = db.transaction('restaurants','readwrite');
                const restaurantStore = tx.objectStore('restaurants');
                restaurantStore.put(obj);
              });

            }
            if (error) callback(error,null);
            else callback(null,obj);
          });
        } else {
          // console.log("Reviews already available - fetchRestaurantById returning object: ", obj);
          callback(null,obj);
        }
      }
    })
  }

  /**
   * Fetch reviews from server.
   */
  static fetchReviewsFromServer(id, callback) {
    fetch(`http://localhost:1337/reviews/?restaurant_id=${id}`)
    .then(response => {
      return response.json();
    })
    .then(jsonData => {
      callback(null, jsonData);
    })
    .catch(error => {
      callback(error, null);
    });
  }

  /**
   * PUT restaurant favorite status
   */
  static putRestaurantFavorite(id, newState, callback) {
    // Open or generate db
    const dbPromise = DBHelper.openIDB();
    // console.log("DB open, about to fetch restaurant: ", id);
    // Try to get our restaurant from the db:
    dbPromise.then(db => {
      return db.transaction('restaurants')
        .objectStore('restaurants').get(parseInt(id));
    }).then(obj => {
      // console.log("get id from db returned: ", obj);
      if (obj === undefined) {
        // Failed to find restaurant {id} from the db => get it from server
        let xhr = new XMLHttpRequest();
        xhr.open('GET', DBHelper.DATABASE_URL + `/${id}`);
        xhr.onload = () => {
          if (xhr.status === 200) { // Got a success response from server!
            restaurant = JSON.parse(xhr.responseText);
            restaurant.is_favorite = newState;
            // Add also to IDB
            dbPromise.then(db => {
              const tx = db.transaction('restaurants','readwrite');
              const restaurantStore = tx.objectStore('restaurants');
              restaurantStore.put(restaurant);
              return restaurantStore.complete;
            });
          } else { // Oops!. Got an error from server.
            const error = (`Request failed. Not in db, cannot reach server. Returned status of ${xhr.status}`);
            console.error(error);
          }
        };
        xhr.send();
      } else { // We have the object in IDB - just change the state
        obj.is_favorite = newState;
        dbPromise.then(db => {
          const tx = db.transaction('restaurants','readwrite');
          const restaurantStore = tx.objectStore('restaurants');
          // console.log("putting obj to db: ", obj);
          restaurantStore.put(obj);
          return restaurantStore.complete;
        }).catch(function(err) {
          console.error('changing is_favorite to indexed_db failed, returned:', err)
        });
      }
      let xhr = new XMLHttpRequest();
      xhr.open('PUT', DBHelper.DATABASE_URL + `/${id}/?is_favorite=${newState}`);
      xhr.onload = () => {
        if (xhr.status === 200) { // Got a success response from server!
          // console.log("Updated is_favorite PUT successful.");
        } else { // Oops!. Got an error from server.
          const error = (`is_favorite PUT request failed. Returned status of ${xhr.status}`);
          console.error(error);
        }
      };
      xhr.send();
    })
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Post new restaurant review
   */
   static postReview(newReview) {
     const dbPromise = DBHelper.openIDB();
    // XMLHttpRequest POST Based on: https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/send
    let xhr = new XMLHttpRequest();
    xhr.open('POST', 'http://localhost:1337/reviews/');
    xhr.onreadystatechange = () => {
      // console.log("postReview onreadystatechange readyState", xhr.readyState, "status", xhr.status);
      if (xhr.readyState == XMLHttpRequest.DONE) {
        if (xhr.status == 201) { // Got a success response from server!
          // console.log("POST appears successful.");
          // Re-sync reviews from server to IDB
          DBHelper.reSyncReviews(newReview.restaurant_id);
        } else { // http POST unsuccessful
          const error = (`Review post failed (possibly offline?). Returned status of ${xhr.status}`);
          console.log(error);
          // Add to pending-reviews IDB
          newReview.updatedAt = new Date().toString(); // Will be replaced by server when posted
          dbPromise.then(db => {
            const tx = db.transaction('pendingreviews','readwrite');
            const reviewStore = tx.objectStore('pendingreviews');
            reviewStore.put(newReview);
          });
          // Sync request adapted from: https://developers.google.com/web/updates/2015/12/background-sync
          navigator.serviceWorker.ready.then(function(swRegistration) {
            // console.log("Registering sync event now!");
            return swRegistration.sync.register('review');
          });
          DBHelper.showNotification('Offline', { body: 'Review saved for posting later when back online.' });
        }
      }
    };
    // console.log("Posting: ", newReview);
    xhr.send(JSON.stringify(newReview));
  }

  /**
   * Get pending reviews from IDB
   */
   static getPendingReviews(restaurantId, callback) {
     let result = [];
     const dbPromise = DBHelper.openIDB();
     dbPromise.then(db => {
       return db.transaction('pendingreviews')
         .objectStore('pendingreviews').getAll();
     }).then(reviews => {
       reviews.forEach(function (review) {
         if (review.restaurant_id == restaurantId) result.push(review);
       })
       return result;
     }).then(selectedReviews => {
       callback(result);
     });
   }

  /**
   * Post offline reviews.
   */
   static postOfflineReviews() {
     return new Promise((resolve,reject) => {
       // Open or generate db
       const dbPromise = DBHelper.openIDB();
       dbPromise.then(db => {
         return db.transaction('pendingreviews')
           .objectStore('pendingreviews').getAll();
       }).then(reviews => {
         return Promise.all(
           reviews.map(review => {
             // The 'review' object has an extra 'id' from IDB, which has to be removed before posting
             // Otherwise it will override the id assigned by the server.
             const postReview = {
               "restaurant_id": review.restaurant_id,
               "name": review.name,
               "rating": review.rating,
               "comments": review.comments
             };
             // console.log("Pending review from IDB: ", postReview);
             fetch('http://localhost:1337/reviews/', {
               method: 'POST',
               mode: "cors",
               body: JSON.stringify(postReview)
             })
             .then(response => {
               // console.log("Success - deleting review from pending: ", review);
               // Delete review from pending
               dbPromise.then(db => {
                 const tx = db.transaction('pendingreviews', 'readwrite');
                 tx.objectStore('pendingreviews').delete(review.id);
               });
               // Re-sync reviews from server to IDB
               DBHelper.reSyncReviews(review.restaurant_id);
               DBHelper.showNotification('Back online', { body: 'Pending review successfully posted.',
                                                          tag: 'reviewPosted'});
             })
             .catch(error => {
               // console.log('Posting of offline reviews failed (still offline?) code: ', error);
               reject(error);
             });
           })
         ).then(obj => {
           // console.log("Everything done now: ", obj);
         });
       });
     });
   }

   /**
    * Re-sync reviews from server for a restaurant
    */
   static reSyncReviews(id) {
     const dbPromise = DBHelper.openIDB();
     // Re-sync reviews from server to IDB
     dbPromise.then(db => {
       return db.transaction('restaurants')
         .objectStore('restaurants').get(id);
     }).then(obj => {
       if (obj != undefined) { // Got the restaurant
           DBHelper.fetchReviewsFromServer(id, (error, reviews) => {
             if (reviews) {
               // console.log("Fetched reviews: ", reviews);
               obj.reviews = reviews;
               // Save restaurant with updated reviews to IDB:
               dbPromise.then(db => {
                 const tx = db.transaction('restaurants','readwrite');
                 const restaurantStore = tx.objectStore('restaurants');
                 restaurantStore.put(obj);
               });
             }
             if (error) console.error(error);
           });
         }
     });
   }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return (`/img/${restaurant.photograph}.webp`);
  }

  /**
   * Small restaurant image URL.
   */
  static smallImageUrlForRestaurant(restaurant) {
    // let smallFile = restaurant.photograph.slice(0, -4) + '-400w' + '.jpg';
    let smallFile = restaurant.photograph + '-400w.webp';
    return (`/img_converted/${smallFile}`);
  }


  /**
   * Restaurant image alt text.
   */
  static altTextForRestaurantImage(restaurant) {
    return (`An image of ${restaurant.name}`);
    // return (`${restaurant.alt}`);
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  }

  /**
   * Post notification for the user
   *
   * Based on the sample in:
   * https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API/Using_the_Notifications_API
   */
  static showNotification(notifTitle, notifBody) {
    // Note: This blows up in a service worker ('window' not defined)
    // Should be prepended by another method of checking, whether running in a service worker,
    // but currently old-fashioned alerts are not a requirement - skip for now.
    // // Check browser support
    // if (!("Notification" in window)) {
    //   // No support - post an old-fashioned alert
    //   alert(notifTitle + '. ' + notifBody.body);
    // }
    // Permission granted?
    if (Notification.permission === "granted") {
      var notification = new Notification(notifTitle, notifBody);
    }
    // Not granted. Denied?
    else if (Notification.permission !== 'denied') {
      Notification.requestPermission(function (permission) {
        if (permission === "granted") {
          var notification = new Notification(notifTitle, notifBody);
        }
      });
    }
  }

}
