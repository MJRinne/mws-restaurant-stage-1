/***************************************
 * Gulpfile.js
 *
 * Collected by Mikko Rinne for Udacity MWD2018 Course
 *
 * Sources:
 * Udacity reviewer suggestions on project phase 2 review
 * https://github.com/gulpjs/gulp/blob/master/docs/getting-started.md
 * Udacity ud892 course project material
 * https://stackoverflow.com/questions/36897877/gulp-error-the-following-tasks-did-not-complete-did-you-forget-to-signal-async
 * https://stackoverflow.com/questions/38886840/how-to-solve-this-minification-error-on-gulp
 * https://www.npmjs.com/package/gulp-uglify-es
 * https://gulpjs.org/api
 * https://www.npmjs.com/package/gulp-inject
 */

var gulp = require('gulp');
var sass = require('gulp-sass');
// var autoprefixer = require('gulp-autoprefixer');
var browserSync = require('browser-sync').create();
var concat = require('gulp-concat');
var htmlmin = require('gulp-htmlmin');
// var inject = require('gulp-inject');
var uglify = require('gulp-uglify-es').default;
// var sourcemaps = require('gulp-sourcemaps');


gulp.task('default', defaultTask);

function defaultTask(done) {
  // place code for your default task here
  done();
}

//
// gulp.task('to-root',
// 	['copy-html-root',
//   'copy-js-root',
//   'copy-swjs-root',
//   'copy-css-root',
//   'copy-img-root',
//   'copy-img-converted-root'], defaultTask);


// gulp.task('scripts', function() {
// 	return gulp.src('src/js/**/*.js')
// 		.pipe(concat('all.js'))
// 		.pipe(gulp.dest('dist/js'));
// });

gulp.task('scripts-index', function() {
	return gulp.src(['src/js/**/dbhelper.js', 'src/js/**/main.js', 'src/js/**/swhelper.js'])
		.pipe(concat('index.js'))
		.pipe(uglify())
		.pipe(gulp.dest('dist/js'));
});

gulp.task('scripts-restaurant', function() {
	return gulp.src(['src/js/**/dbhelper.js', 'src/js/**/restaurant_info.js'])
		.pipe(concat('restaurant.js'))
		.pipe(uglify())
		.pipe(gulp.dest('dist/js'));
});

gulp.task('styles-src', function() {
	return gulp.src('src/sass/**/*.scss')
		.pipe(sass().on('error', sass.logError))
		// .pipe(autoprefixer({
		// 	browsers: ['last 2 versions']
		// }))
		.pipe(gulp.dest('src/css'));
});

gulp.task('styles-index', function() {
	return gulp.src(['src/sass/**/common.scss', 'src/sass/**/index.scss'])
		.pipe(sass({
			outputStyle: 'compressed'
		}).on('error', sass.logError))
		// .pipe(autoprefixer({
		// 	browsers: ['last 2 versions']
		// }))
    .pipe(concat('index.css'))
		.pipe(gulp.dest('dist/css'));
});

gulp.task('styles-restaurant', function() {
	return gulp.src(['src/sass/**/common.scss', 'src/sass/**/restaurant.scss'])
		.pipe(sass({
			outputStyle: 'compressed'
		}).on('error', sass.logError))
		// .pipe(autoprefixer({
		// 	browsers: ['last 2 versions']
		// }))
    .pipe(concat('restaurant.css'))
		.pipe(gulp.dest('dist/css'));
});


gulp.task('copy-html-root', function() {
	return gulp.src('dist/*.html')
    .pipe(htmlmin({collapseWhitespace: true}))
		.pipe(gulp.dest('.'));
});

gulp.task('copy-js-root', function() {
	return gulp.src('dist/js/*.js')
		.pipe(gulp.dest('./js'));
});

gulp.task('copy-swjs-root', function() {
	return gulp.src('dist/sw.js')
    .pipe(uglify())
		.pipe(gulp.dest('.'));
});

gulp.task('copy-css-root', function() {
	return gulp.src('dist/css/*.css')
		.pipe(gulp.dest('./css'));
});

gulp.task('copy-img-root', function() {
	return gulp.src('src/img/*.jpg')
		.pipe(gulp.dest('./img'));
});

gulp.task('copy-img-converted-root', function() {
	return gulp.src('src/img_converted/*.jpg')
		.pipe(gulp.dest('./img_converted'));
});



// gulp.task('inject', function () {
//   var target = gulp.src('./index.html');
//   // It's not necessary to read the files (will speed up things), we're only after their paths:
//   var sources = gulp.src(['./src/**/*.js', './src/**/*.css'], {read: false});
//
//   return target.pipe(inject(sources))
//     .pipe(gulp.dest('.'));
// });

gulp.task('to-dist', gulp.series('scripts-index',
'scripts-restaurant',
'styles-index',
'styles-restaurant'));

gulp.task('to-root', gulp.series('copy-html-root',
'copy-js-root',
'copy-swjs-root',
'copy-css-root',
'copy-img-root',
'copy-img-converted-root'));