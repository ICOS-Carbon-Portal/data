'use strict';

var gulp = require('gulp');
var gp_uglify = require('gulp-uglify');
var browserify = require('browserify');
var bcss = require('browserify-css');
var buffer = require('vinyl-buffer');
var gp_replace = require('gulp-replace');
var del = require('del');
var source = require('vinyl-source-stream');
var babelify = require('babelify');
var runSequence = require('run-sequence');


var currentPath = __dirname;
var project = currentPath.split('/').pop();

var replaceSearch = "url(node_modules/leaflet/dist/images/";
var replacement = "url(/style/map-graph/images/";

var paths = {
	main: 'main/main.jsx',
	jsx: 'main/**/*.jsx',
	js: 'main/**/*.js',
	commonjs: '../common/main/**/*.js*',
	imagesSource: 'node_modules/leaflet/dist/**/*.png',
	styleTargetDir: '../../resources/style/map-graph/',
	target: '../../resources/',
	bundleFile: project + '.js'
};

gulp.task('clean', function() {
	return del([paths.target + paths.bundleFile], {force: true});
});

gulp.task('apply-prod-environment', function() {
	process.env.NODE_ENV = 'production';
});

gulp.task('images', function() {
	return gulp.src(paths.imagesSource)
		.pipe(gulp.dest(paths.styleTargetDir));
});

function compileJs() {
	var browser = browserify({
			entries: [paths.main],
			debug: false
		})
		.transform(bcss, {
			global: true,
			minify: true,
			minifyOptions: {compatibility: '*'}
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
			.pipe(gp_replace(replaceSearch, replacement))
			.pipe(gulp.dest(paths.target));
	} else {
		return browser
			.pipe(source(paths.bundleFile))
			.pipe(gp_replace(replaceSearch, replacement))
			.pipe(gulp.dest(paths.target));
	}
}

gulp.task('build', function(){
	runSequence(
		'clean',
		'images',
		compileJs
	);
});

gulp.task('publish', ['apply-prod-environment', 'clean'], compileJs);
gulp.task('default', ['publish']);
