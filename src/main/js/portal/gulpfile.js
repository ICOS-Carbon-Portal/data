'use strict';

var gulp = require('gulp');
var gp_uglify = require('gulp-uglify');
var browserify = require('browserify');
var buffer = require('vinyl-buffer');
var del = require('del');
var source = require('vinyl-source-stream');
var babelify = require('babelify');
let sass = require('gulp-sass');
let cleanCSS = require('gulp-clean-css');


var currentPath = __dirname;
var project = currentPath.split('/').pop();

var paths = {
	main: 'main/main.jsx',
	jsx: 'main/**/*.jsx',
	js: 'main/**/*.js',
	commonjs: '../common/main/**/*.js*',
	target: '../../resources/',
	sassSources: ['node_modules/react-widgets/lib/scss/react-widgets.scss'],
	sassExtSources: [
		'node_modules/react-widgets/lib/**/fonts/*',
		'node_modules/react-widgets/lib/**/img/*'
	],
	sassTarget: '../../resources/style/' + project + '/',
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

gulp.task('js', ['clean', 'sass', 'sass-ext'], compileJs);

gulp.task('sass', function () {
	return gulp.src(paths.sassSources)
		.pipe(sass())
		.pipe(cleanCSS({compatibility: '*'}))	//Internet Explorer 10+ compatibility mode
		.pipe(gulp.dest(paths.sassTarget + 'css/'));
});

gulp.task('sass-ext', function () {
	return gulp.src(paths.sassExtSources)
		.pipe(gulp.dest(paths.sassTarget));
});

gulp.task('build', ['js'], function(){
	var sources = [paths.commonjs, paths.js, paths.jsx];
	return gulp.watch(sources, ['js']);
});

gulp.task('publish', ['apply-prod-environment', 'js'], compileJs);
gulp.task('default', ['publish']);
