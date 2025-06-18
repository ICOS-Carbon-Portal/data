const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');

module.exports = merge(common, {
	mode: 'production',
	output: {
		filename: '[name].[contenthash].js',
	},
	optimization: {
		minimize: true,
		minimizer: [
			new CssMinimizerPlugin({
				test: /\.css$/i,
				parallel: true,
			}),
			new TerserPlugin({
				test: /\.js$/i,
				parallel: true,
				terserOptions: {
					ecma: '2017',
					sourceMap: true,
				},
			}),
		],
	},
	plugins: [
		new MiniCssExtractPlugin({
			filename: '[name].[contenthash].css',
			chunkFilename: '[id].[contenthash].css',
		}),
	],
});
