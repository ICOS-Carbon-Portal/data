'use strict';

import gulp from 'gulp';
import del from 'del';

import buildConf from '../common/main/buildConf';

const currentPath = __dirname;
const project = currentPath.split('/').pop();

const paths = {
	main: 'main/main.jsx',
	jsx: 'main/**/*.jsx',
	js: 'main/**/*.js',
	commonjs: '../common/main/**/*.js*',
	target: '../../resources/',
	bundleFile: project + '.js'
};

const clean = _ => {
	return del([paths.target + paths.bundleFile], {force: true});
};

const compileSrc = _ => {
	const isProduction = process.env.NODE_ENV === 'production';

	return buildConf.transformToBundle(isProduction, paths);
};

gulp.task('build', gulp.series(clean, compileSrc));

gulp.task('publish', gulp.series(buildConf.applyProdEnvironment, 'build'));

gulp.task('default', gulp.series('publish'));
