const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const CleanTerminalPlugin = require('clean-terminal-webpack-plugin');

module.exports = merge(common, {
	mode: 'development',
	plugins: [
		new CleanTerminalPlugin({
			message: 'Starting to build portal app...',
			onlyInWatchMode: true,
			skipFirstRun: true,
			beforeCompile: true
		}),
	],
	watch: true,
	// devtool: "inline-source-map",
	cache: {
		type: 'memory',
	}
});
