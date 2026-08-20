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
	const shouldUploadSourcemaps = mode === 'production' && env.SENTRY_UPLOAD === 'true';
	const release = env.RELEASE;

	if (shouldUploadSourcemaps && !authToken) {
		throw new Error('SENTRY_AUTH_TOKEN is required when SENTRY_UPLOAD=true. Define it in src/main/js/portal/.env.production.local');
	}

	if (shouldUploadSourcemaps && !release) {
		throw new Error('RELEASE is required when SENTRY_UPLOAD=true. It is normally set by SBT cpFrontendPublish.');
	}

	return {
		plugins: [
			react(),
			...(shouldUploadSourcemaps ? [sentryVitePlugin({
				authToken,
				org: 'icos-cp',
				project: 'data-portal',
				url: 'https://sentry.icos-cp.eu/',
				release: {
					name: release,
				},
			})] : []),
		],
		define: {
			'import.meta.env.VITE_SENTRY_RELEASE': JSON.stringify(release || ''),
		},
		// Temporary, for as long as icos-cp-multiselect is consumed via a `file:`/link
		// symlink. Vite resolves the package through its real path, which sits outside
		// this app's node_modules, so React would resolve from that package's own
		// node_modules and give two React instances ("Invalid hook call"). `dedupe`
		// pins them to this app's copy; `optimizeDeps.include` pre-bundles the linked
		// package, which Vite skips for linked deps and which it needs because the
		// package ships CommonJS. Remove both once it is installed from the registry.
		resolve: {
			dedupe: ['react', 'react-dom'],
		},
		optimizeDeps: {
			include: ['icos-cp-multiselect'],
		},
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
