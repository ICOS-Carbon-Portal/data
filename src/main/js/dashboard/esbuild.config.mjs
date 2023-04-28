import * as esbuild from 'esbuild'
import buildConf from '../common/main/buildConf.js'

const plugins = [{
	name: 'watcher',
	setup(build) {
		build.onEnd(result => {
			if (!result.errors.length) console.log("⚡️ Done");
		});
	},
}];

await esbuild.context({
	entryPoints: ['main/main.jsx'],
	bundle: true,
	minify: process.argv.includes("--minify"),
	sourcemap: true,
	plugins,
	outfile: buildConf.buildTarget + 'dashboard/dashboard.js',
}).then(context => {
	if (process.argv.includes("--watch")) {
		// Enable watch mode
		context.watch()
	} else {
		// Build once and exit if not in watch mode
		context.rebuild().then(() => {
			context.dispose()
		})
	}
})
