'use strict';

var gulp = require('gulp');
var gp_uglify = require('gulp-uglify');
var browserify = require('browserify');
var buffer = require('vinyl-buffer');
var del = require('del');
var source = require('vinyl-source-stream');
var babelify = require('babelify');


var currentPath = __dirname;
var project = currentPath.split('/').pop();

var paths = {
	main: 'main/main.jsx',
	jsx: 'main/**/*.jsx',
	js: 'main/**/*.js',
	commonjs: '../common/main/**/*.js*',
	target: '../../resources/',
	bundleFile: project + '.js'
};

gulp.task('clean', function() {
	return del([paths.target + paths.bundleFile], {force: true});
});

gulp.task('apply-prod-environment', function() {
	process.env.NODE_ENV = 'production';
});

function compileJs() {
	var browser = browserify({
			entries: [paths.main],
			debug: false
		})
		.transform(babelify, {presets: ["es2015", "react"]})
		.bundle()
		.on('error', function(err){
			console.log(err);
			this.emit('end');
		});

	if (process.env.NODE_ENV === 'production'){
		return browser
			.pipe(source(paths.bundleFile))
			.pipe(buffer())
			.pipe(gp_uglify())
			.pipe(gulp.dest(paths.target));
	} else {
		return browser
			.pipe(source(paths.bundleFile))
			.pipe(gulp.dest(paths.target));
	}
}

gulp.task('build', ['clean'], compileJs);

gulp.task('publish', ['apply-prod-environment', 'clean'], compileJs);
gulp.task('default', ['publish']);
