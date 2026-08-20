const path = require('path');
const appName = path.basename(__dirname);
const buildConf = require('../common/main/buildConf.js');
const buildFolder = path.resolve(buildConf.buildTarget, appName);

module.exports = {
	entry: './main/main.jsx',
	output: {
		path: buildFolder,
		filename: 'stats.js',
		clean: true,
	},
	devtool: 'source-map',
	module: {
		rules: [
			{
				test: /.jsx?$/,
				exclude: /(node_modules)/,
				use: {
					loader: "swc-loader"
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
		// Temporary, for as long as icos-cp-multiselect is consumed via a `file:`/link
		// symlink. Webpack resolves the package to its real path, outside this app's
		// node_modules, so React would resolve from that package's own node_modules and
		// give two React instances ("Invalid hook call"). Remove once it is installed
		// from the registry.
		alias: {
			react: path.resolve(__dirname, 'node_modules/react'),
		},
	},
};