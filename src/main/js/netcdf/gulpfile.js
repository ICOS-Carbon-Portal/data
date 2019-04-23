'use strict';

var gulp = require('gulp');
var babel = require('gulp-babel');
var gp_uglify = require('gulp-uglify');
var browserify = require('browserify');
var bcss = require('browserify-css');
var gp_replace = require('gulp-replace');
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

var presets = [
	[
		"@babel/preset-env",
		{
			"targets": {
				"chrome": "60",
				"opera": "58",
				"edge": "11",
				"firefox": "68",
				"safari": "12"
			}
		}
	],
	[
		"@babel/preset-react"
	]
];

function clean(){
	return del([paths.target + paths.bundleFile, paths.styleTargetDir], {force: true});
}

function applyProdEnvironment(cb){
	process.env.NODE_ENV = 'production';
	return cb();
}

function copyImages(){
	return gulp.src(paths.imagesSource).pipe(gulp.dest(paths.styleTargetDir));
}

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
		.transform(babelify, {presets: presets})
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

gulp.task('build', gulp.series(clean, copyImages, compileJs));

gulp.task('publish', gulp.series(applyProdEnvironment, 'build'));

gulp.task('default', gulp.series('publish'));
