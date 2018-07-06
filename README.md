# Restaurant Reviews
---
## Overview

This repository contains my project work for [Udacity's](https://eu.udacity.com/) Mobile Web Specialist Certification Course. The master-branch currently contains my code for phase 2 review of the project.

## Inserting the Google Maps API key

The [config.js-file](https://github.com/MJRinne/mws-restaurant-stage-1/blob/master/config.js) on the root level has a template for the Google Maps API key:

`const google_maps_api_key = "INSERT_GOOGLE_MAPS_API_KEY_HERE";`

Replace the string with a valid Google Maps API key for testing. Note that if you want to run the `src` directory with unpacked source files as web service root, a copy of `config.js` will be needed also in `src`.

## Running the server

This web application fetches data from a local sail server. The code for the server is available [via this link](https://github.com/udacity/mws-restaurant-stage-2/tree/master/api).

## Instructions for [gulp](https://gulpjs.org/)

The web app can be optimised using gulp. After having `node` and `npm` installed, install gulp-cli:

`$ npm install --global gulp-cli`

The different gulp plugins used in the process are included in `package.json` and can be installed with npm:

`$ npm i`

There are three main operations defined for gulp:

1. Setup the unoptimized web-app to run from the src-directory:
`$ gulp styles-src`

1. Package the scripts and css to the dist-subdirectory:
`$ gulp to-dist`

1. Copy all the necessary files from the dist-subdirectory to project root for execution:
`$ gulp to-root`

## Getting started recap

To run the fully functional and optimized restaurant web-app:

1. Insert the Google Maps API key as instructed above
1. Run the sail server as instructed above.
1. `$ gulp to-dist`
1. `$ gulp to-root`
1. Run a python server from the project root: `$ python3 -m http.server 8000`
1. Open: `localhost:8000` on a browser
