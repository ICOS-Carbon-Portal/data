'use strict';

import gulp from 'gulp';
import del from 'del';

import buildConf from '../common/main/buildConf';

const currentPath = __dirname;
const project = currentPath.split('/').pop();
const tsTarget = './tsTarget/';

const paths = {
	main: `${tsTarget}${project}/main/main.js`,
	src: `${tsTarget}${project}/main/**/*.js*`,
	cssSrc: './main/*.css*',
	cssTarget: `${tsTarget}${project}/main/`,
	commonjs: `${tsTarget}common/main/**/*.js*`,
	bundleFile: project + '.js'
};

const clean = _ => {
	return del([buildConf.buildTarget + paths.bundleFile], {force: true});
};

const compileSrc = _ => {
	const isProduction = process.env.NODE_ENV === 'production';

	return buildConf.transformToBundle(isProduction, paths);
};

const copyCSS = _ => {
	return gulp.src(paths.cssSrc)
		.pipe(gulp.dest(paths.cssTarget));
};

gulp.task('build', gulp.series(clean, copyCSS, compileSrc));

gulp.task('buildWatch', gulp.series('build', buildConf.watch([paths.src], gulp.series('build'))));

gulp.task('publish', gulp.series(buildConf.applyProdEnvironment, 'build'));

gulp.task('default', gulp.series('publish'));
