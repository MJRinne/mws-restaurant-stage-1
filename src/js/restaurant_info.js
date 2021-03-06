let restaurant;
var map;

document.addEventListener('DOMContentLoaded', (event) => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      fillBreadcrumb();
    }
  });
});

/**
 * Initialize Google map, called from HTML.
 */
 // window.
// const initMap = () => {
//   fetchRestaurantFromURL((error, restaurant) => {
//     if (error) { // Got an error!
//       console.error(error);
//     } else {
//       self.map = new google.maps.Map(document.getElementById('map'), {
//         zoom: 16,
//         center: restaurant.latlng,
//         scrollwheel: false
//       });
//       fillBreadcrumb();
//       DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
//     }
//   });
// }

/**
 * Initialize Google map when pointed at
 */

const onMap = document.querySelector('#map');

onMap.onmouseover = function(event) {
  if (self.map == undefined) {
    self.map = new google.maps.Map(document.getElementById('map'), {
      zoom: 16,
      center: self.restaurant.latlng,
      scrollwheel: false
    });
    DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
  }
}

/**
 * Get current restaurant from page URL.
 */
const fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
const fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  let large_image_url = DBHelper.imageUrlForRestaurant(restaurant);
  let small_image_url = DBHelper.smallImageUrlForRestaurant(restaurant);

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img'
  image.src = large_image_url;
  image.srcset = large_image_url + " 800w, " + small_image_url + " 400w";
  image.sizes = '(max-width 509px) 90wv, 45wv'; // On the details-page a two-column view is the smallest
  image.alt = DBHelper.altTextForRestaurantImage(restaurant);

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillReviewsHTML();
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
const fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
const fillReviewsHTML = (reviews = self.restaurant.reviews) => {
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h2');
  title.innerHTML = 'Reviews';
  container.appendChild(title);

  DBHelper.getPendingReviews(self.restaurant.id,pendingReviews => {
    reviews.push.apply(reviews, pendingReviews); // https://stackoverflow.com/a/1374131/5528498

    if (!reviews) {
      const noReviews = document.createElement('p');
      noReviews.innerHTML = 'No reviews yet!';
      container.appendChild(noReviews);
      return;
    }
    const ul = document.getElementById('reviews-list');
    reviews.forEach(review => {
      ul.appendChild(createReviewHTML(review));
    });
    container.appendChild(ul);

  });

}

/**
 * Create review HTML and add it to the webpage.
 */
const createReviewHTML = (review) => {
  const li = document.createElement('li');
  const name = document.createElement('p');
  name.innerHTML = review.name;
  name.setAttribute('aria-label', 'reviewer name ' + review.name);
  li.appendChild(name);

  const date = document.createElement('p');
  date.innerHTML = new Date(review.updatedAt).toString();
  date.setAttribute('aria-label', 'review date ' + review.date);
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
const fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
const getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

/**
 * Submit the review form
 */
const submitReview = () => {
  // Hide the form
  document.getElementById('review-form').style.display='none';
  const newReview = {
    "restaurant_id": self.restaurant.id,
    "name": document.getElementById("new-name").value,
    "rating": parseInt(document.getElementById("new-rating").value),
    "comments": document.getElementById("new-comments").value
  };
  // Post review on-screen
  const ul = document.getElementById('reviews-list');
  let directReview = Object.assign({}, newReview);
  directReview["updatedAt"] = new Date();
  // console.log("DirectReview element: ", directReview);
  ul.appendChild(createReviewHTML(directReview));
  // Post to IDB and try server
  DBHelper.postReview(newReview);
}

/****
* Skip the map during tabbing *
*/

const resTAB_KEY = 9;
const resBeforeMap = document.querySelector('#breadcrumb-link');
const resAfterMap = document.querySelector('#footer-link');

resBeforeMap.onkeydown = function(event) {
   if (event.keyCode == TAB_KEY && !event.shiftKey) {
       event.preventDefault();
       resAfterMap.focus();
   }
};

resAfterMap.onkeydown = function(event) {
  if (event.keyCode == TAB_KEY && event.shiftKey) {
      event.preventDefault();
      resBeforeMap.focus();
  }
}
