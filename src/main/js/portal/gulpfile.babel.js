'use strict';

import gulp from 'gulp';
import del from 'del';
import babel from 'gulp-babel';
import jasmine from 'gulp-jasmine';
import sass from 'gulp-sass';
import sassVars from 'gulp-sass-variables';
import cleanCSS from 'gulp-clean-css';

import buildConf from '../common/main/buildConf.js';

const currentPath = __dirname;
const project = currentPath.split('/').pop();
const testRoot = 'target/';
const testMain = testRoot + 'src/main/';
const testCommon = testRoot + 'common/main/';
const testJasmine = testRoot + 'test/';
const tsTarget = './tsTarget/';


const paths = {
	project,
	main: `${tsTarget}${project}/main/main.jsx`,
	js: 'main/**/*.js',
	commonjs: '../common/main/**/*.js*',
	tsTarget,
	sassSources: [
		'main/portal.scss',
		'main/react-widgets-override.scss',
		'node_modules/react-widgets/lib/scss/react-widgets.scss'
	],
	sassExtSources: [
		'node_modules/react-widgets/lib/**/fonts/*',
		'node_modules/react-widgets/lib/**/img/*'
	],
	sassTarget: buildConf.buildTarget + 'style/' + project + '/',
	sassResources: buildConf.buildTarget + 'style/' + project + '/',
	jasmineSrc: 'test/**/*.js',
	bundleFile: project + '.js'
};

const clean = _ => {
	const patterns = [
		buildConf.buildTarget + paths.bundleFile,
		paths.sassTarget,
		paths.sassResources,
	];
	return del(patterns, {force: true});
};

const compileSrc = _ => {
	const isProduction = process.env.NODE_ENV === 'production';

	return buildConf.transformToBundle(isProduction, paths);
};

const cleanSassTarget = _ => {
	return del([paths.sassTarget], {force: true});
};

const transformSass = _ => {
	return gulp.src(paths.sassSources)
		.pipe(sassVars({
			'$font-path': '/style/portal/fonts',
			'$img-path': '/style/portal/img'
		}))
		.pipe(sass())
		.pipe(cleanCSS({compatibility: '*'}))	//Internet Explorer 10+ compatibility mode
		.pipe(gulp.dest(paths.sassTarget + 'css/'));
};

const transformSassExt = _ => {
	return gulp.src(paths.sassExtSources, {since: gulp.lastRun(transformSassExt)})
		.pipe(gulp.dest(paths.sassTarget));
};

const cleanTest = _ => {
	return del([testRoot]);
};

const transform = (src, dest) => {
	return gulp.src(src)
		.pipe(babel({presets: buildConf.presets}))
		.pipe(gulp.dest(dest));
};

const transformJasmine = _ => {
	return transform(paths.jasmineSrc, testJasmine);
};

const transformSrc = _ => {
	return transform(`${paths.tsTarget}${paths.project}/${paths.js}`, testMain);
};

const transformCommon = _ => {
	return transform(paths.commonjs, testCommon);
};

const runJasmine = _ => {
	return gulp.src(testJasmine + '*.js').pipe(jasmine());
};


gulp.task('test', gulp.series(
	cleanTest,
	gulp.parallel(transformJasmine, transformSrc, transformCommon),
	runJasmine
));

gulp.task('build', gulp.series(
	gulp.parallel(clean, cleanSassTarget),
	transformSass, transformSassExt, compileSrc)
);

const jsToWatch = ['js', 'jsx'].map(ext => `${paths.tsTarget}**/*.${ext}`);
const cssToWatch = ['css', 'scss'].map(ext => `main/**/*.${ext}`);
const filesToWatch = [...jsToWatch, ...cssToWatch];

gulp.task('buildWatch', gulp.series('build', buildConf.watch(filesToWatch, gulp.series('build'))));

gulp.task('publish', gulp.series('test', buildConf.applyProdEnvironment, 'build'));

gulp.task('default', gulp.series('publish'));
