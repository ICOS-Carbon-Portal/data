'use strict';

var gulp = require('gulp');
var browserify = require('browserify');
var del = require('del');
var source = require('vinyl-source-stream');
var babelify = require('babelify');

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

	gulp.task('js' + project, function() {

		return browserify({
				entries: [paths.main],
				debug: false
			})
			.transform(babelify, {presets: ["es2015", "react"]})
			.bundle()
			.on('error', function(err){
                        	console.log(err);
                        	this.emit('end');
		       	})
			.pipe(source(paths.bundleFile))
			.pipe(gulp.dest(paths.target));

	});

	gulp.task('watch' + project, function() {
		var sources = paths.js.concat(paths.jsx, paths.common);
		gulp.watch(sources, ['clean' + project, 'js' + project]);
	});

	gulp.task(project, ['watch' + project, 'js' + project]);

});

