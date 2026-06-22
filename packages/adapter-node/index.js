import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rollup } from 'rollup';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import replace from '@rollup/plugin-replace';

/**
 * @template T
 * @template {keyof T} K
 * @typedef {Partial<Omit<T, K>> & Required<Pick<T, K>>} PartialExcept
 */

/**
 * We use a custom `Builder` type here to support the minimum version of SvelteKit.
 * @typedef {PartialExcept<import('@sveltejs/kit').Builder, 'log' | 'rimraf' | 'mkdirp' | 'config' | 'prerendered' | 'routes' | 'createEntries' | 'findServerAssets' | 'generateFallback' | 'generateEnvModule' | 'generateManifest' | 'getBuildDirectory' | 'getClientDirectory' | 'getServerDirectory' | 'getAppPath' | 'writeClient' | 'writePrerendered' | 'writePrerendered' | 'writeServer' | 'copy' | 'compress'>} Builder2_4_0
 */

const files = fileURLToPath(new URL('./files', import.meta.url).href);

/** @type {import('./index.js').default} */
export default function (opts = {}) {
	const { out = 'build', precompress = true, envPrefix = '' } = opts;

	return {
		name: '@sveltejs/adapter-node',
		/** @param {Builder2_4_0} builder */
		async adapt(builder) {
			const tmp = builder.getBuildDirectory('adapter-node');

			builder.rimraf(out);
			builder.rimraf(tmp);
			builder.mkdirp(tmp);

			builder.log.minor('Copying assets');
			builder.writeClient(`${out}/client${builder.config.kit.paths.base}`);
			builder.writePrerendered(`${out}/prerendered${builder.config.kit.paths.base}`);

			if (precompress) {
				builder.log.minor('Compressing assets');
				await Promise.all([
					builder.compress(`${out}/client`),
					builder.compress(`${out}/prerendered`)
				]);
			}

			builder.log.minor('Building server');

			// Copy the entrypoints into `.svelte-kit/adapter-node/entries`,
			// so that node modules are correctly resolved
			const entries = `${tmp}/entries`;
			builder.copy(files, entries);

			const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
			const server = builder.getServerDirectory();

			/** @type {Record<string, string>} */
			const input = {
				index: `${entries}/index.js`,
				env: `${entries}/env.js`,
				handler: `${entries}/handler.js`,
				shims: `${entries}/shims.js`
			};

			if (builder.hasServerInstrumentationFile?.()) {
				input['instrumentation.server'] = `${server}/instrumentation.server.js`;
			}

			// we bundle the Vite output so that deployments only need
			// their production dependencies. Anything in devDependencies
			// will get included in the bundled code
			const bundle = await rollup({
				input,
				external: [
					// dependencies could have deep exports, so we need a regex
					...Object.keys(pkg.dependencies || {}).map((d) => new RegExp(`^${d}(\\/.*)?$`))
				],
				plugins: [
					{
						name: 'adapter-node:alias',
						resolveId(id) {
							if (id === 'SERVER') return `${server}/index.js`;
							if (id === 'MANIFEST') return `${server}/manifest.js`;
						}
					},
					// ensure our entries that use `import.meta.url` resolves to the root
					// even if their code has been moved to a shared chunk directory
					// see https://rollupjs.org/plugin-development/#resolveimportmeta
					{
						name: 'adapter-node:import-meta-url-current-module',
						resolveImportMeta(property, { moduleId }) {
							if (property === 'url' && moduleId.startsWith(entries)) {
								const module_dir = path.dirname(moduleId);
								return `new URL('${path.relative(module_dir, entries)}', import.meta.url)`;
							}
							return null;
						}
					},
					nodeResolve({
						preferBuiltins: true,
						exportConditions: ['node']
					}),
					// @ts-expect-error https://github.com/rollup/plugins/issues/1329
					replace({
						// only replace tokens in the adapter's own entrypoints, so that
						// identifiers like `BASE` in the user's app code or bundled
						// dependencies aren't accidentally replaced
						include: [`${entries}/**`],
						values: {
							BASE: JSON.stringify(builder.config.kit.paths.base),
							ENV_PREFIX: JSON.stringify(envPrefix),
							PRECOMPRESS: JSON.stringify(precompress),
							PRERENDERED: `new Set(${JSON.stringify(builder.prerendered.paths)})`
						},
						preventAssignment: true
					}),
					// @ts-expect-error https://github.com/rollup/plugins/issues/1329
					commonjs({ strictRequires: true }),
					// @ts-expect-error https://github.com/rollup/plugins/issues/1329
					json()
				]
			});

			await bundle.write({
				dir: out,
				format: 'esm',
				sourcemap: true,
				chunkFileNames: 'server/chunks/[name]-[hash].js'
			});

			if (builder.hasServerInstrumentationFile?.()) {
				builder.instrument?.({
					entrypoint: `${out}/index.js`,
					instrumentation: `${out}/instrumentation.server.js`,
					module: {
						exports: ['path', 'host', 'port', 'server']
					}
				});
			}
		},

		supports: {
			read: () => true,
			instrumentation: () => true
		}
	};
}
