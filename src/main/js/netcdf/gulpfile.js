'use strict';

var gulp = require('gulp');
var gp_uglify = require('gulp-uglify');
var browserify = require('browserify');
var bcss = require('browserify-css');
var gp_replace = require('gulp-replace');
var runSequence = require('run-sequence');
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
	imagesSource: 'node_modules/icos-cp-netcdfmap/dist/**/*.png',
	styleTargetDir: '../../resources/style/netcdf/',
	target: '../../resources/',
	bundleFile: project + '.js'
};

gulp.task('clean', function() {
	return del([paths.target + paths.bundleFile, paths.styleTargetDir], {force: true});
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
			.pipe(gp_replace('url(node_modules/icos-cp-netcdfmap/dist/images/', 'url(/style/netcdf/images/'))
			.pipe(gulp.dest(paths.target));
	} else {
		return browser
			.pipe(source(paths.bundleFile))
			.pipe(gp_replace('url(node_modules/icos-cp-netcdfmap/dist/images/', 'url(/style/netcdf/images/'))
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

gulp.task('publish', ['apply-prod-environment', 'build'], compileJs);
gulp.task('default', ['publish']);
