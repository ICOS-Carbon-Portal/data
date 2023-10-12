const path = require('path');
const appName = path.basename(__dirname);
const buildConf = require('../common/main/buildConf.js');
const buildFolder = path.resolve(buildConf.buildTarget, appName);

module.exports = {
	entry: './main/main.jsx',
	output: {
		path: buildFolder,
		filename: 'netcdf.js',
		clean: true,
	},
	devtool: 'source-map',
	module: {
		rules: [
			{
				test: /.(tsx?|jsx?)$/,
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