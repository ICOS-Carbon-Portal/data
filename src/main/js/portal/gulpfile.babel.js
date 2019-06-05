'use strict';

import gulp from 'gulp';
// import gp_uglify from 'gulp-uglify';
// import buffer from 'vinyl-buffer';
import del from 'del';

import babel from 'gulp-babel';
import jasmine from 'gulp-jasmine';
import sass from 'gulp-sass';
import sassVars from 'gulp-sass-variables';
import cleanCSS from 'gulp-clean-css';

// import tsify from 'tsify';
// import watchify from 'watchify';

import buildConf from '../common/main/buildConf.js';

const currentPath = __dirname;
const project = currentPath.split('/').pop();
const testRoot = 'target/';
const testMain = testRoot + 'src/main/';
const testCommon = testRoot + 'common/main/';
const testJasmine = testRoot + 'test/';
console.log({currentPath, project});

const paths = {
	main: 'main/main.jsx',
	jsx: 'main/**/*.jsx',
	js: 'main/**/*.js',
	tsx: 'main/**/*.tsx',
	ts: 'main/**/*.ts',
	commonjs: '../common/main/**/*.js*',
	target: '../../resources/',
	sassSources: [
		'portal.scss',
		'node_modules/react-widgets/lib/scss/react-widgets.scss',
		'react-widgets-override.scss'
	],
	sassExtSources: [
		'node_modules/react-widgets/lib/**/fonts/*',
		'node_modules/react-widgets/lib/**/img/*'
	],
	sassTarget: '../../resources/style/' + project + '/',
	jasmineSrc: 'test/**/*.js',
	bundleFile: project + '.js'
};

const clean = _ => {
	return del([paths.target + paths.bundleFile], {force: true});
};

// const presets = [
// 	[
// 		"@babel/preset-env",
// 		{
// 			"targets": {
// 				"chrome": "60",
// 				"opera": "58",
// 				"edge": "11",
// 				"firefox": "68",
// 				"safari": "12"
// 			}
// 		}
// 	],
// 	[
// 		"@babel/preset-react"
// 	],
// 	[
// 		"@babel/typescript"
// 	]
// ];
// import browserify from 'browserify';
// import bcss from 'browserify-css';
// import babelify from 'babelify';
// import source from 'vinyl-source-stream';

// const transformToBundle = (isProduction) => {
//
// 	const bExtraOptions = isProduction ? {} : {
// 		cache: {},
// 		packageCache: {},
// 		plugin: [watchify],
// 		debug: true
// 	};
// 	const bOptions = Object.assign({entries: [paths.main]}, bExtraOptions);
//
// 	const b = browserify(bOptions);
//
// 	const bundle = ids => {
// 		if (ids) {
// 			console.log('Updating bundle from', ids.map(f => f.split('/').pop()).join(','));
// 		}
//
// 		const stream = b
// 			.plugin(tsify)
// 			.transform(bcss, {
// 				global: true,
// 				minify: true,
// 				minifyOptions: {compatibility: '*'}
// 			})
// 			.transform(babelify, {
// 				presets: presets,
// 				extensions: ['.js', '.jsx', '.ts', '.tsx']
// 			})
// 			.bundle()
// 			.on('error', err => {
// 				console.log('bundle error');
// 				console.log(err);
// 				this.emit('end');
// 			})
// 			.pipe(source(paths.bundleFile));
//
// 		const postProcessing = isProduction
// 			? stream
// 				.pipe(buffer())
// 				.pipe(gp_uglify())
// 			: stream;
//
// 		return postProcessing.pipe(gulp.dest(paths.target));
// 	};
//
// 	b.on('update', bundle);
//
// 	b.on('time', time => {
// 		const now = new Date();
// 		const opts = {hour:'2-digit', minute:'2-digit', second:'2-digit'};
// 		const currTime = now.toLocaleString('se-SE', opts);
// 		const seconds = (time / 1000).toFixed(2);
// 		console.log(`[${currTime}] Finished incremental build after ${seconds} s`);
// 	});
//
// 	return bundle();
// };

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
	return gulp.src(paths.sassExtSources)
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

gulp.task('build', gulp.series(
	gulp.parallel(clean, cleanSassTarget),
	transformSass, transformSassExt, compileSrc));

gulp.task('publish', gulp.series('test', buildConf.applyProdEnvironment, 'build'));

gulp.task('default', gulp.series('publish'));
