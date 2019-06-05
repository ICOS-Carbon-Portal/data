'use strict';

import gulp from 'gulp';
// import gp_replace from 'gulp-replace';
import del from 'del';

import buildConf from '../common/main/buildConf.js';

const currentPath = __dirname;
const project = currentPath.split('/').pop();

const replaceSearch = "url(node_modules/leaflet/dist/images/";
const replacement = "url(/style/map-graph/images/";

const paths = {
	main: 'main/main.jsx',
	jsx: 'main/**/*.jsx',
	js: 'main/**/*.js',
	commonjs: '../common/main/**/*.js*',
	imagesSource: 'node_modules/leaflet/dist/**/*.png',
	styleTargetDir: './target/style/map-graph/',
	target: './target/',
	resources: '../../resources/',
	bundleFile: project + '.js'
};

const clean = _ => {
	return del([paths.target + paths.bundleFile], {force: true});
};

const compileSrc = _ => {
	const isProduction = process.env.NODE_ENV === 'production';

	return buildConf.transformToBundle(isProduction, paths, {replaceSearch, replacement});
};

const copyImages = _ => {
	return gulp.src(paths.imagesSource).pipe(gulp.dest(paths.styleTargetDir));
};


gulp.task('build', gulp.series(clean, copyImages, compileSrc));

gulp.task('publish', gulp.series(buildConf.applyProdEnvironment, 'build'));

gulp.task('default', gulp.series('publish'));
