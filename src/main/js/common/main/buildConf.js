'use strict';

var browserify = require('browserify');
var bcss = require('browserify-css');
var babelify = require('babelify');
var source = require('vinyl-source-stream');

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
	]
];

const applyProdEnvironment = cb => {
	process.env.NODE_ENV = 'production';
	return cb();
};

const transformToBundle = (isProduction, paths) => {

	return browserify({
			entries: [paths.main],
			debug: !isProduction
		})
		.transform(bcss, {
			global: true,
			minify: true,
			minifyOptions: {compatibility: '*'}
		})
		.transform(babelify, {presets: presets})
		.bundle()
		.on('error', function(err){
			console.log(err);
			this.emit('end');
		})
		.pipe(source(paths.bundleFile));
};

module.exports = {
	presets,
	applyProdEnvironment,
	transformToBundle
};
