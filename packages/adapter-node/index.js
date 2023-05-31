import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rollup } from 'rollup';
import * as sorcery from 'sorcery';
import { createFilter } from '@rollup/pluginutils';

/**
 * @param {string} path
 */
const resolve = (path) => fileURLToPath(new URL(path, import.meta.url));

/** @type {import('.').default} */
export default function (opts = {}) {
	const { out = 'build', precompress, envPrefix = '', polyfill = true } = opts;

	return {
		name: '@sveltejs/adapter-node',

		async adapt(builder) {
			// use an adjacent temporary directory so that any relative paths in eg. sourcemaps don't break
			const tmp = path.join(path.dirname(builder.getServerDirectory()), 'adapter-node');

			builder.rimraf(out);
			builder.rimraf(tmp);
			builder.mkdirp(tmp);

			const sourcemapfilter = createFilter(`${tmp}/**/*.js`);

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

			builder.writeServer(tmp);

			writeFileSync(
				`${tmp}/manifest.js`,
				`export const manifest = ${builder.generateManifest({ relativePath: './' })};\n\n` +
					`export const prerendered = new Set(${JSON.stringify(builder.prerendered.paths)});\n`
			);

			const pkg = JSON.parse(readFileSync('package.json', 'utf8'));

			// we bundle the Vite output so that deployments only need
			// their production dependencies. Anything in devDependencies
			// will get included in the bundled code
			const bundle = await rollup({
				input: {
					handler: resolve('./src/handler.js'),
					index: resolve('./src/index.js')
				},
				external: [
					// dependencies could have deep exports, so we need a regex
					...Object.keys(pkg.dependencies || {}).map((d) => new RegExp(`^${d}(\\/.*)?$`))
				],
				plugins: [
					{
						name: 'adapter-node-resolve',
						resolveId(id) {
							switch (id) {
								case 'MANIFEST':
									return `${tmp}/manifest.js`;
								case 'SERVER':
									return `${tmp}/index.js`;
								case 'SHIMS':
									return '\0virtual:SHIMS';
							}
						},
						load(id) {
							if (id === '\0virtual:SHIMS') {
								return polyfill
									? "import { installPolyfills } from '@sveltejs/kit/node/polyfills'; installPolyfills();"
									: '';
							}
						},
						resolveImportMeta(property, { chunkId, moduleId }) {
							if (property === 'SERVER_DIR' && moduleId === resolve('./src/handler.js')) {
								const segments = chunkId.split('/').length - 1;

								return `new URL("${'../'.repeat(segments) || '.'}", import.meta.url)`;
							} else if (property === 'ENV_PREFIX' && moduleId === resolve('./src/env.js')) {
								return JSON.stringify(envPrefix);
							}
						}
					},
					nodeResolve({
						preferBuiltins: true,
						exportConditions: ['node']
					}),
					commonjs({ strictRequires: true }),
					json(),
					{
						name: 'adapter-node-sourcemap',
						load(id) {
							if (!sourcemapfilter(id)) return null;
							try {
								const chain = sorcery.loadSync(id);
								if (!chain) return null;
								const map = chain.apply();
								return {
									code: readFileSync(id, 'utf-8'),
									map: map.toString()
								};
							} catch {}
						}
					}
				]
			});

			await bundle.write({
				dir: out,
				format: 'esm',
				sourcemap: true,
				chunkFileNames: 'server/chunks/[name]-[hash].js',
				hoistTransitiveImports: false
			});
		}
	};
}
