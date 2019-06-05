'use strict';

var browserify = require('browserify');
var bcss = require('browserify-css');
var babelify = require('babelify');
var source = require('vinyl-source-stream');
var gulp = require('gulp');
var tsify = require('tsify');
var watchify = require('watchify');
var gp_uglify = require('gulp-uglify');
var buffer = require('vinyl-buffer');
var gp_replace = require('gulp-replace');

const presets = [
	[
		"@babel/preset-env",
		{
			"targets": {
				"chrome": "60",
				"opera": "58",
				"edge": "11",
				"firefox": "68",
				"safari": "12"
			}
		}
	],
	[
		"@babel/preset-react"
	],
	[
		"@babel/typescript"
	]
];

const compilerOptions = {
	"skipLibCheck": true,
	"jsx": "react",
	// Target latest version of ECMAScript.
	"target": "esnext",
	// Search under node_modules for non-relative imports.
	"moduleResolution": "node",
	// Process & infer types from .js files.
	"allowJs": true,
	// Don't emit; allow Babel to transform files.
	"noEmit": true,
	// Enable strictest settings like strictNullChecks & noImplicitAny.
	"strict": false,
	// Disallow features that require cross-file information for emit.
	"isolatedModules": false,//true,
	// Import non-ES modules as default imports.
	"esModuleInterop": true
};

const applyProdEnvironment = cb => {
	process.env.NODE_ENV = 'production';
	return cb();
};

const transformToBundle = (isProduction, paths, gulpReplace) => {

	const bExtraOptions = isProduction ? {} : {
		cache: {},
		packageCache: {},
		plugin: [watchify],
		debug: true
	};
	const bOptions = Object.assign({entries: [paths.main]}, bExtraOptions);

	const b = browserify(bOptions);

	const bundle = ids => {
		if (ids) {
			console.log('Updating bundle from', ids.map(f => f.split('/').pop()).join(', '));
		}

		const stream = b
			.plugin(tsify, compilerOptions)
			.transform(bcss, {
				global: true,
				minify: true,
				minifyOptions: {compatibility: '*'}
			})
			.transform(babelify, {
				presets: presets,
				extensions: ['.js', '.jsx', '.ts', '.tsx']
			})
			.bundle()
			.on('error', err => {
				console.log(err);
				this.emit('end');
			})
			.pipe(source(paths.bundleFile));

		const minify = isProduction
			? stream
				.pipe(buffer())
				.pipe(gp_uglify())
			: stream;

		const replacer = gulpReplace
			? minify.pipe(gp_replace(gulpReplace.replaceSearch, gulpReplace.replacement))
			: minify;

		const target = replacer.pipe(gulp.dest(paths.target))
			.pipe(gulp.src([paths.target + 'style/**/*'], { base: './target/' }))
			.pipe(gulp.dest(paths.resources));

		return target;
	};

	b.on('update', bundle);

	b.on('time', time => {
		const now = new Date();
		const opts = {hour:'2-digit', minute:'2-digit', second:'2-digit'};
		const currTime = now.toLocaleString('se-SE', opts);
		const seconds = (time / 1000).toFixed(2);
		console.log(`[${currTime}] Finished incremental build after ${seconds} s`);
	});

	return bundle();
};

const moveTarget = paths => {
	return gulp.src(paths.target, { base: './' }).pipe(gulp.dest(paths.resources));
};

module.exports = {
	presets,
	applyProdEnvironment,
	transformToBundle
};
