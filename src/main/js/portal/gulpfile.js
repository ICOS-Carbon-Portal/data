'use strict';

var gulp = require('gulp');
var gp_uglify = require('gulp-uglify');
var browserify = require('browserify');
var buffer = require('vinyl-buffer');
var del = require('del');
var source = require('vinyl-source-stream');
var babel = require('gulp-babel');
var babelify = require('babelify');
var jasmine = require('gulp-jasmine');
var sass = require('gulp-sass');
var cleanCSS = require('gulp-clean-css');
var runSequence = require('run-sequence');


var currentPath = __dirname;
var project = currentPath.split('/').pop();
var testRoot = 'target/';
var testMain = testRoot + 'src/main/';
var testCommon = testRoot + 'common/main/';
var testJasmine = testRoot + 'test/';

var paths = {
	main: 'main/main.jsx',
	jsx: 'main/**/*.jsx',
	js: 'main/**/*.js',
	commonjs: '../common/main/**/*.js*',
	target: '../../resources/',
	sassSources: ['portal.scss','node_modules/react-widgets/lib/scss/react-widgets.scss'],
	sassExtSources: [
		'node_modules/react-widgets/lib/**/fonts/*',
		'node_modules/react-widgets/lib/**/img/*'
	],
	sassTarget: '../../resources/style/' + project + '/',
	jasmineSrc: 'test/**/*.js',
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

gulp.task('build', ['clean', 'sass', 'sass-ext'], compileJs);

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

gulp.task('clean_test', function() {
	return del([testRoot]);
});

gulp.task('transpile_jasmine', function(){
	return gulp.src(paths.jasmineSrc)
		.pipe(babel({presets: ['es2015']}))
		.pipe(gulp.dest(testJasmine));
});

gulp.task('transpile_src', function(){
	return gulp.src(paths.js)
		.pipe(babel({presets: ['es2015']}))
		.pipe(gulp.dest(testMain));
});

gulp.task('transpile_common', function(){
	return gulp.src(paths.commonjs)
		.pipe(babel({presets: ['es2015']}))
		.pipe(gulp.dest(testCommon));
});

gulp.task('run_jasmine', function(){
	return gulp.src(testJasmine + '*.js').pipe(jasmine());
});

gulp.task('test', function(){
	runSequence(
		'clean_test',
		['transpile_jasmine', 'transpile_src', 'transpile_common'],
		'run_jasmine'
	);
});

gulp.task('publish', function(){
	runSequence(
		'test',
		['apply-prod-environment','build']
	);
});

// gulp.task('publish', ['test', 'apply-prod-environment', 'js']);
gulp.task('default', ['publish']);
