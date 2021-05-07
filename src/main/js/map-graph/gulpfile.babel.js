'use strict';

import path from 'path';
import gulp from 'gulp';
import del from 'del';

import buildConf from '../common/main/buildConf';

const project = path.basename(__dirname);
const tsTarget = './tsTarget/';

const replaceSearch = "url(node_modules/leaflet/dist/images/";
const replacement = `url(/${project}/images/`;

const paths = {
	main: `${tsTarget}${project}/main/main.jsx`,
	src: `${tsTarget}${project}/main/**/*.js*`,
	imagesSource: 'node_modules/leaflet/dist/**/*.png',
	styleTargetDir: buildConf.buildTarget + project + '/',
	copyCss: {
		from: '../common/main/Dygraphs.css',
		to: `${tsTarget}/common/main/`
	},
	bundleFile: path.resolve(project, project + '.js')
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

const copyCss = _ => {
	return gulp.src(paths.copyCss.from).pipe(gulp.dest(paths.copyCss.to));
};

gulp.task('build', gulp.series(clean, copyImages, copyCss, compileSrc));

gulp.task('buildWatch', gulp.series('build', buildConf.watch([paths.src], gulp.series('build'))));

gulp.task('publish', gulp.series(buildConf.applyProdEnvironment, 'build'));

gulp.task('default', gulp.series('publish'));
