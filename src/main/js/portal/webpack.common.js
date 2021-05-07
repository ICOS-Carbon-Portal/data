const path = require('path');
const fs = require('fs');
const FileManagerPlugin = require('filemanager-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const buildConf = require('../common/main/buildConf.js');

const buildFolder = path.resolve(__dirname, 'dist');
const appName = path.basename(__dirname);
const destinationFolderJs = path.resolve(buildConf.buildTarget, appName);
const destinationFolderStyle = path.resolve(buildConf.buildTarget, 'style', appName, 'css');

const filesInDestinationToClean = fs.existsSync(buildFolder)
	? fs.readdirSync(buildFolder).map(file => {
		return file.endsWith('.js')
			? {
				source: path.resolve(destinationFolderJs, file),
				options: { force: true }
			}
			: {
				source: path.resolve(destinationFolderStyle, file),
				options: { force: true }
			}
		})
	: [path.resolve(buildFolder, 'nonExistingFile.nada')];

module.exports = {
	entry: {
		portal: './main/main.tsx'
	},
	output: {
		path: buildFolder,
		filename: '[name].js',
		clean: true,
	},
	plugins: [
		new FileManagerPlugin({
			events: {
				onEnd: {
					delete: filesInDestinationToClean,
					copy: [
						{ source: buildFolder + '/*.js', destination: destinationFolderJs },
						{ source: buildFolder + '/*.(css|gif)', destination: destinationFolderStyle },
					],
				},
			},
			runTasksInSeries: true
		}),
		new MiniCssExtractPlugin({
			filename: '[name].css',
			chunkFilename: '[id].[hash].css',
		}),
	],
	module: {
		rules: [
			{
				test: /\.(ts|tsx)$/,
				loader: 'ts-loader',
				exclude: ['/node_modules/'],
			},

			{
				test: /\.css$/i,
				use: [
					{
						loader: MiniCssExtractPlugin.loader,
						options: {
							publicPath: buildFolder,
						},
					},
					'css-loader',
				],
			},

			{
				test: /\.scss$/i,
				use: [
					{
						loader: MiniCssExtractPlugin.loader,
						options: {
							publicPath: buildFolder,
						},
					},
					'css-loader',
					{
						loader: "sass-loader",
						options: {
							// Prefer `dart-sass`
							implementation: require("sass"),
						},
					},
				],
			},

			{
				test: /\.(eot|svg|ttf|woff|woff2|png|jpg|gif)$/,
				type: 'asset',
			},
		],
	},
	resolve: {
		extensions: ['.tsx', '.ts', '.js', '.jsx'],
	},
	stats: {
		builtAt: true,
		// errorDetails: true,
		// children: true,
	}
};
