'use strict';

var gulp = require('gulp');
var gp_uglify = require('gulp-uglify');
var browserify = require('browserify');
var buffer = require('vinyl-buffer');
var del = require('del');
var source = require('vinyl-source-stream');
var babelify = require('babelify');
var babel = require('gulp-babel');
var preprocessify = require('preprocessify');
var jasmine = require('gulp-jasmine');

['netcdf', 'portal', 'stilt'].forEach(function(project){

	var projSrc = 'src/main/js/' + project + '/';
	var jstarget = 'target/es5js/' + project + '/';

	var paths = {
		main: projSrc + 'main/main.jsx',
		jsx: projSrc + 'main/**/*.jsx',
		js: projSrc + 'main/**/*.js',
		alljs: projSrc + '**/*.js',
		commonjs: 'src/main/js/common/main/**/*.js*',
		target: 'src/main/resources/',
		jasmineSrc: jstarget + 'test/**/*.js',
		bundleFile: project + '.js'
	};

	gulp.task('clean' + project, function() {
		return del([paths.target + paths.bundleFile]);
	});

	gulp.task('apply-prod-environment', function() {
		process.env.NODE_ENV = 'production';
	});

	function compileJs() {
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
	}

	gulp.task('js' + project, ['clean' + project], compileJs);

	gulp.task('clean_es5' + project, function() {
		return del([jstarget]);
	});

	gulp.task('transpile' + project, ['clean_es5' + project], function(){
		return gulp.src(paths.alljs)
			.pipe(babel({presets: ['es2015']}))
			.pipe(gulp.dest(jstarget));
	});

	gulp.task('test' + project, ['transpile' + project], function(){
		return gulp.src(paths.jasmineSrc).pipe(jasmine());
	});

	gulp.task('tdd' + project, ['test' + project], function(){
		return gulp.watch([paths.alljs], ['test' + project]);
	});

	gulp.task(project, ['js' + project], function(){
		var sources = [paths.commonjs, paths.js, paths.jsx];
		return gulp.watch(sources, ['js' + project]);
	});

	gulp.task('publish' + project, ['apply-prod-environment', 'clean' + project], compileJs);
});

