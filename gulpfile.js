'use strict';

var gulp = require('gulp');
var gp_uglify = require('gulp-uglify');
var browserify = require('browserify');
var buffer = require('vinyl-buffer');
var del = require('del');
var source = require('vinyl-source-stream');
var babelify = require('babelify');
var preprocessify = require('preprocessify');

['netcdf', 'portal'].forEach(function(project){

	var paths = {
		main: 'src/main/js/' + project + '/main.jsx',
		jsx: ['src/main/js/' + project + '/**/*.jsx'],
		js: ['src/main/js/' + project + '/**/*.js'],
		testjs: ['src/test/js/' + project + '/**/*.js'],
		common: ['src/main/js/common/**/*.js'],
		target: 'src/main/resources/',
		bundleFile: project + '.js'
	};

	gulp.task('clean' + project, function(done) {
		del([paths.target + paths.bundleFile], done);
	});

	gulp.task('apply-prod-environment', function() {
		process.env.NODE_ENV = 'production';
	});

	gulp.task('js' + project, function() {

		var browser = browserify({
				entries: [paths.main],
				debug: false
			})
			.transform(preprocessify({NODE_ENV: process.env.NODE_ENV}))
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
	});

	gulp.task('watch' + project, function() {

		var sources = paths.js.concat(paths.jsx, paths.common);
		gulp.watch(sources, ['clean' + project, 'js' + project]);
	});

	gulp.task(project, ['clean' + project, 'js' + project, 'watch' + project]);

	gulp.task('publish' + project, ['apply-prod-environment', 'clean' + project, 'js' + project]);
});

