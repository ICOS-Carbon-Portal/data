'use strict';

import gulp from 'gulp';
import gp_uglify from 'gulp-uglify';
import buffer from 'vinyl-buffer';
import del from 'del';

import buildConf from '../common/main/buildConf.js';

const currentPath = __dirname;
const project = currentPath.split('/').pop();

const paths = {
	main: 'main/main.jsx',
	src: 'main/**/*.js*',
	jsx: 'main/**/*.jsx',
	js: 'main/**/*.js',
	commonjs: '../common/main/**/*.js*',
	bundleFile: project + '.js'
};

const clean = _ => {
	return del([buildConf.buildTarget + paths.bundleFile], {force: true});
};

const compileJs = _ =>  {
	const isProduction = process.env.NODE_ENV === 'production';

	return buildConf.transformToBundle(isProduction, paths);
};

gulp.task('build', gulp.series(clean, compileJs));

gulp.task('buildWatch', gulp.series('build', buildConf.watch([paths.src], gulp.series('build'))));

gulp.task('publish', gulp.series(buildConf.applyProdEnvironment, 'build'));

gulp.task('default', gulp.series('publish'));

