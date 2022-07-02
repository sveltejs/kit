import esbuild from 'esbuild';
import fs from 'fs';

const watch = process.argv.includes('--watch');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

(fs.rmSync || fs.rmdirSync)('assets', { recursive: true, force: true });

await esbuild.build({
	bundle: true,
	entryPoints: [
		'src/runtime/client/start.js',
		'src/runtime/client/singletons.js',
		'src/runtime/app/navigation.js',
		'src/runtime/app/stores.js',
		'src/runtime/app/paths.js',
		'src/runtime/app/env.js',
		'src/runtime/paths.js',
		'src/runtime/env.js'
	],
	external: [
		'svelte',
		'svelte/store',
		'__GENERATED__/root.svelte',
		'__GENERATED__/client-manifest.js'
	],
	format: 'esm',
	outdir: 'assets',
	outbase: 'src/runtime',
	splitting: true,
	watch: watch && {
		onRebuild(error) {
			if (error) console.error(error);
			else console.log('rebuilt assets');
		}
	}
});

await esbuild.build({
	entryPoints: ['src/runtime/server/index.js'],
	format: 'esm',
	outfile: 'assets/server/index.js',
	watch: watch && {
		onRebuild(error) {
			if (error) console.error(error);
			else console.log('rebuilt server');
		}
	}
});

esbuild.build({
	bundle: true,
	entryPoints: {
		cli: 'src/cli.js',
		node: 'src/node/index.js',
		'node/polyfills': 'src/node/polyfills.js',
		hooks: 'src/hooks.js',
		vite: 'src/vite/index.js'
	},
	define: {
		__VERSION__: JSON.stringify(pkg.version),
		'process.env.BUNDLED': 'true'
	},
	external: [
		...Object.keys(pkg.dependencies || {}),
		...Object.keys(pkg.peerDependencies || {}),
		...Object.keys(process.binding('natives')),
		...Object.keys(process.binding('natives')).map((id) => `node:${id}`),
		'typescript',
		'svelte2tsx'
	],
	format: 'esm',
	outdir: 'dist',
	splitting: true,
	watch: watch && {
		onRebuild(error) {
			if (error) console.error(error);
			else console.log('rebuilt exports');
		}
	}
});
