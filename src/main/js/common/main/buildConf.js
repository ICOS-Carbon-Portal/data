'use strict';

var gulp = require('gulp');
var browserify = require('browserify');
var bcss = require('browserify-css');
var babelify = require('babelify');
var source = require('vinyl-source-stream');
var gp_uglify = require('gulp-uglify');
var buffer = require('vinyl-buffer');
var gp_replace = require('gulp-replace');

const presets = [
	[
		"@babel/preset-env",
		{
			"targets": "defaults"
		}
	],
	[
		"@babel/preset-react"
	]
];

const applyProdEnvironment = cb => {
	process.env.NODE_ENV = 'production';
	return cb();
};

const buildTarget = '../../../../target/scala-3.2.0/classes/frontendapps/';

const watch = (filesToWatch, buildTask) => {
	return function watch() {
		const watcher = gulp.watch(filesToWatch, buildTask);

		watcher.on('change', path => {
			console.log(`File ${path} was changed`);
		});

		watcher.on('add', path => {
			if (path.endsWith("___jb_tmp___")) return;

			console.log(`File ${path} was added`);
		});

		watcher.on('unlink', path => {
			if (path.endsWith("___jb_tmp___")) return;

			console.log(`File ${path} was removed`);
		});
	}
};

const transformToBundle = (isProduction, paths, gulpReplace) => {

	const stream = browserify({
		entries: [paths.main],
		debug: !isProduction,
		extensions: ['.jsx']
	})
		.transform(bcss, {
			global: true,
			minify: true,
			minifyOptions: {compatibility: '*'}
		})
		.transform(babelify, {
			presets,
			extensions: ['.js', '.jsx', '.ts', '.tsx']
		})
		.bundle()
		.on('error', function(err) {
			console.log(err);
			this.emit('end');
		})
		.pipe(source(paths.bundleFile));

	const minify = isProduction
		? stream
			.pipe(buffer())
			.pipe(gp_uglify())
		: stream;

	const replacer = gulpReplace
		? minify.pipe(gp_replace(gulpReplace.replaceSearch, gulpReplace.replacement))
		: minify;

	return replacer.pipe(gulp.dest(buildTarget));
};

module.exports = {
	presets,
	buildTarget,
	watch,
	applyProdEnvironment,
	transformToBundle
};
