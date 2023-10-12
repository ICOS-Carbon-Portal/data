const path = require('path');
const appName = path.basename(__dirname);
const buildConf = require('../common/main/buildConf.js');
const buildFolder = path.resolve(buildConf.buildTarget, appName);

module.exports = {
	entry: {
		'dygraph-light': {
			import: './main/main.ts',
			dependOn: 'dygraphs'
		},
		dygraphs: 'dygraphs'
	},
	devtool: 'source-map',
	output: {
		path: buildFolder,
		filename: '[name].js',
		clean: true,
	},
	optimization: {
		runtimeChunk: 'single'
	},
	module: {
		rules: [
			{
				test: /.tsx?$/,
				exclude: /(node_modules)/,
				use: {
					loader: "ts-loader"
				}
			},
			{
				test: /\.css$/i,
				use: ["style-loader", "css-loader"],
			},
		],
	},
	resolve: {
		extensions: ['.tsx', '.ts', '.js', '.jsx'],
	},
};