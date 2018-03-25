let restaurants,
  neighborhoods,
  cuisines
var map
var markers = []

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  fetchNeighborhoods();
  fetchCuisines();
});

/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) { // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
}

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
}

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
}

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
}

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });

  // This removes tab index for the map markers, but not for any of the default map decoration
  // Map skipping implemented by capturing TAB-behavious instead
  // google.maps.event.addListener(self.map, "tilesloaded", function(){
  //   document.querySelectorAll('#map *').forEach(function(item) {
  //     item.setAttribute('tabindex','-1');
  //   });
  // })

  updateRestaurants();

}

/**
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
    }
  })
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  self.markers.forEach(m => m.setMap(null));
  self.markers = [];
  self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
}

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');

  let large_image_url = DBHelper.imageUrlForRestaurant(restaurant);
  let small_image_url = DBHelper.smallImageUrlForRestaurant(restaurant);

  const image = document.createElement('img');
  image.className = 'restaurant-img';
  image.src = large_image_url;
  image.srcset = large_image_url + " 800w, " + small_image_url + " 400w";
  image.sizes = '(max-width 509px) 90wv, 45wv'; // On the details-page a two-column view is the smallest
  image.alt = DBHelper.altTextForRestaurantImage(restaurant);
  // li.append(image);

  const picturelink = document.createElement('a');
  picturelink.href = DBHelper.urlForRestaurant(restaurant);
  picturelink.setAttribute('tabIndex', -1); // Don't tab-focus on the image, just the title
  picturelink.append(image);
  li.append(picturelink);
  // console.log("New image-element: ", picturelink);

  const name = document.createElement('h1');
  name.innerHTML = restaurant.name;
  // li.append(name);

  const namelink = document.createElement('a');
  namelink.href = DBHelper.urlForRestaurant(restaurant);
  namelink.append(name);
  li.append(namelink);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  li.append(neighborhood);

  const address = document.createElement('a');
  address.innerHTML = restaurant.address;
  address.href = "#map";
  li.append(address);

  // Restaurant title now links to more info - button is redundant

  // const more = document.createElement('a');
  // more.innerHTML = 'View Details';
  // more.href = DBHelper.urlForRestaurant(restaurant);
  // li.append(more)

  return li
}

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = self.restaurants) => {
  let bounds = new google.maps.LatLngBounds();
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url
    });
    bounds.extend(marker.position);
    self.markers.push(marker);
  });
  self.map.fitBounds(bounds);
}

/****
* Skip the map in tabbing *
*/

const TAB_KEY = 9;
var beforeMap = document.querySelector('#main-header > a');
var afterMap = document.querySelector('#neighborhoods-select');

beforeMap.onkeydown = function(event) {
   if (event.keyCode == TAB_KEY && !event.shiftKey) {
       event.preventDefault();
       afterMap.focus();
   }
};

afterMap.onkeydown = function(event) {
  if (event.keyCode == TAB_KEY && event.shiftKey) {
      event.preventDefault();
      beforeMap.focus();
  }
}
