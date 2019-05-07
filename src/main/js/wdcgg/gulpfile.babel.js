'use strict';

import gulp from 'gulp';
import gp_uglify from 'gulp-uglify';
import buffer from 'vinyl-buffer';
import del from 'del';
import babel from 'gulp-babel';
import jasmine from 'gulp-jasmine';

import buildConf from '../common/main/buildConf';

const currentPath = __dirname;
const project = currentPath.split('/').pop();
const testRoot = 'target/';
const testMain = testRoot + 'src/main/';
const testCommon = testRoot + 'common/main/';
const testJasmine = testRoot + 'test/';

const paths = {
	main: 'main/main.jsx',
	jsx: 'main/**/*.jsx',
	js: 'main/**/*.js',
	commonjs: '../common/main/**/*.js*',
	target: '../../resources/',
	jasmineSrc: 'test/**/*.js',
	bundleFile: project + '.js'
};

const clean = _ => {
	return del([paths.target + paths.bundleFile], {force: true});
};

const compileJs = _ =>  {
	const isProduction = process.env.NODE_ENV === 'production';

	let stream = buildConf.transformToBundle(isProduction, paths);

	stream = isProduction
		? stream
			.pipe(buffer())
			.pipe(gp_uglify())
		: stream;

	return stream
		.pipe(gulp.dest(paths.target));
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
	return transform(paths.js, testMain);
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

gulp.task('build', gulp.series(clean, compileJs));

gulp.task('publish', gulp.series(buildConf.applyProdEnvironment, 'build'));

gulp.task('default', gulp.series('publish'));
