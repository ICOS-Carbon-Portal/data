const path = require('path');
const { defineConfig, loadEnv } = require('vite');
const react = require('@vitejs/plugin-react');
const { sentryVitePlugin } = require('@sentry/vite-plugin');
const buildConf = require('../common/main/buildConf.js');

const appName = path.basename(__dirname);  // 'portal'
const outDir = path.resolve(buildConf.buildTarget, appName);

module.exports = defineConfig(({ mode }) => {
	const env = loadEnv(mode, __dirname, '');
	const authToken = env.SENTRY_AUTH_TOKEN;
	if (mode === 'production' && !authToken) {
		throw new Error('SENTRY_AUTH_TOKEN is required for portal publish builds. Define it in src/main/js/portal/.env.production.local');
	}

	return {
		plugins: [
			react(),
			...(authToken ? [sentryVitePlugin({
				authToken,
				org: 'icos-cp',
				project: 'data-portal',
				url: 'https://sentry.icos-cp.eu/',
			})] : []),
		],
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
			scss: {
				implementation: require('sass'),
				silenceDeprecations: ['import', 'color-functions', 'global-builtin', 'if-function'],
			}
		}
	}
	};
});
