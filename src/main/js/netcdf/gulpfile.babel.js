'use strict';

import gulp from 'gulp';
import del from 'del';

import buildConf from '../common/main/buildConf.js';

const currentPath = __dirname;
const project = currentPath.split('/').pop();

const replaceSearch = "url(node_modules/icos-cp-netcdfmap/dist/images/";
const replacement = "url(/style/netcdf/images/";

const paths = {
	main: 'main/main.jsx',
	src: 'main/**/*.js*',
	commonjs: '../common/main/**/*.js*',
	imagesSource: 'node_modules/icos-cp-netcdfmap/dist/**/*.png',
	styleTargetDir: buildConf.buildTarget + 'style/' + project + '/',
	bundleFile: project + '.js'
};

const clean = _ => {
	return del([buildConf.buildTarget + paths.bundleFile, paths.styleTargetDir], {force: true});
};

const compileSrc = _ => {
	const isProduction = process.env.NODE_ENV === 'production';

	return buildConf.transformToBundle(isProduction, paths, {replaceSearch, replacement});
};

const copyImages = _ => {
	return gulp.src(paths.imagesSource).pipe(gulp.dest(paths.styleTargetDir));
};


gulp.task('build', gulp.series(clean, copyImages, compileSrc));

gulp.task('buildWatch', gulp.series('build', buildConf.watch([paths.src], gulp.series('build'))));

gulp.task('publish', gulp.series(buildConf.applyProdEnvironment, 'build'));

gulp.task('default', gulp.series('publish'));
