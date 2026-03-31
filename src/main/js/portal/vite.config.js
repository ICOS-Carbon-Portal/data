const path = require('path');
const { defineConfig } = require('vite');
const react = require('@vitejs/plugin-react');
const buildConf = require('../common/main/buildConf.js');

const appName = path.basename(__dirname);  // 'portal'
const outDir = path.resolve(buildConf.buildTarget, appName);

module.exports = defineConfig(({ mode }) => ({
	plugins: [react()],
	build: {
		outDir,
		emptyOutDir: true,
		sourcemap: true,
		minify: mode === 'production',
		rollupOptions: {
			input: { portal: path.resolve(__dirname, 'main/main.tsx') },
			output: {
				entryFileNames: '[name].js',
				chunkFileNames: '[name]-[hash].js',
				assetFileNames: (assetInfo) =>
					assetInfo.name?.endsWith('.css') ? 'css/[name][extname]' : '[name][extname]',
			}
		}
	},
	css: {
		preprocessorOptions: {
			scss: { implementation: require('sass') }
		}
	}
}));
