'use strict';

import path from 'path';
import gulp from 'gulp';
import dartSass from 'sass';
import gulpSass from 'gulp-sass';
import sassVars from 'gulp-sass-variables';
import cleanCSS from 'gulp-clean-css';
import del from 'del';

import buildConf from '../common/main/buildConf.js';

const project = path.basename(__dirname);
const sass = gulpSass(dartSass)

const paths = {
	main: 'main/main.jsx',
	src: 'main/**/*.js*',
	jsx: 'main/**/*.jsx',
	js: 'main/**/*.js',
	sassSources: [
		'main/stats.scss',
		'node_modules/react-widgets/lib/scss/react-widgets.scss'
	],
	sassExtSources: [
		'node_modules/react-widgets/lib/**/fonts/*',
		'node_modules/react-widgets/lib/**/img/*'
	],
	sassTarget: buildConf.buildTarget + project + '/',
	commonjs: '../common/main/**/*.js*',
	bundleFile: path.resolve(project, project + '.js')
};

const clean = _ => {
	const patterns = [
		buildConf.buildTarget + paths.bundleFile,
		paths.sassTarget,
	];
	return del(patterns, { force: true });
};

const compileJs = _ => {
	const isProduction = process.env.NODE_ENV === 'production';

	return buildConf.transformToBundle(isProduction, paths);
};

const transformSass = _ => {
	return gulp.src(paths.sassSources)
		.pipe(sassVars({
			'$font-path': `/${project}/fonts`,
			'$img-path': `/${project}/img`
		}))
		.pipe(sass())
		.pipe(cleanCSS({ compatibility: '*' }))	//Internet Explorer 10+ compatibility mode
		.pipe(gulp.dest(paths.sassTarget + 'css/'));
};

const transformSassExt = _ => {
	return gulp.src(paths.sassExtSources, { since: gulp.lastRun(transformSassExt) })
		.pipe(gulp.dest(paths.sassTarget));
};

gulp.task('build', gulp.series(
	gulp.parallel(clean),
	transformSass, transformSassExt, compileJs)
);

const jsToWatch = ['js', 'jsx'].map(ext => `main/**/*.${ext}`);
const cssToWatch = ['css', 'scss'].map(ext => `main/**/*.${ext}`);
const filesToWatch = [...jsToWatch, ...cssToWatch];

gulp.task('buildWatch', gulp.series('build', buildConf.watch(filesToWatch, gulp.series('build'))));

gulp.task('publish', gulp.series(buildConf.applyProdEnvironment, 'build'));

gulp.task('default', gulp.series('publish'));
