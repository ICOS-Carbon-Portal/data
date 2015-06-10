'use strict';

var gulp = require('gulp');
var browserify = require('browserify');
var del = require('del');
var reactify = require('reactify');
var source = require('vinyl-source-stream');
var jasmine = require('gulp-jasmine');

var paths = {
	main: 'src/main/js/main.js',
	jsx: ['src/main/js/**/*.jsx'],
	js: ['src/main/js/**/*.js'],
	testjs: ['src/test/js/**/*.js'],
	target: 'src/main/resources/',
	bundleFile: 'bundle.js'
};

gulp.task('clean', function(done) {
	del([paths.target + paths.bundleFile], done);
});

gulp.task('js', ['clean'], function() {

	return browserify({
			entries: [paths.main],
			debug: false,
			transform: [reactify]
		})
		.bundle()
		.on('error', function(err){
			console.log(err);
			this.emit('end');
		})
		.pipe(source(paths.bundleFile))
		.pipe(gulp.dest(paths.target));

});

gulp.task('watch', function() {
	var sources = paths.js.concat(paths.jsx);
	gulp.watch(sources, ['js']);
});

gulp.task('test', function () {
	return gulp
		.src(paths.testjs)
		.pipe(jasmine());
});

gulp.task('default', ['watch', 'js']);

