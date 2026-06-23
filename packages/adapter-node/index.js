import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { rolldown } from 'rolldown';

const files = fileURLToPath(new URL('./files', import.meta.url).href);

/** @param {string} str */
function escape_regex(str) {
	return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** @type {import('./index.js').default} */
export default function (opts = {}) {
	const { out = 'build', precompress = true, envPrefix = '' } = opts;

	return {
		name: '@sveltejs/adapter-node',
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

			const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
			const server = builder.getServerDirectory();

			// Copy the prebuilt entrypoints into the build directory so that the
			// adapter's own bundled dependencies resolve correctly, then bundle them
			// together with the app's server code. Bundling everything in a single
			// pass means shared modules (e.g. `SvelteKitError` from `@sveltejs/kit`)
			// aren't duplicated. See https://github.com/sveltejs/kit/issues/15755
			const entries = `${tmp}/entries`;
			builder.copy(files, entries);

			writeFileSync(
				`${tmp}/manifest.js`,
				[
					`export const manifest = ${builder.generateManifest({ relativePath: './' })};`,
					`export const prerendered = new Set(${JSON.stringify(builder.prerendered.paths)});`,
					`export const base = ${JSON.stringify(builder.config.kit.paths.base)};`
				].join('\n\n')
			);

			/** @type {Record<string, string>} */
			const input = {
				index: `${entries}/index.js`,
				env: `${entries}/env.js`,
				handler: `${entries}/handler.js`
			};

			if (builder.hasServerInstrumentationFile()) {
				input['instrumentation.server'] = `${server}/instrumentation.server.js`;
			}

			// we bundle the Vite output so that deployments only need
			// their production dependencies. Anything in devDependencies
			// will get included in the bundled code
			const bundle = await rolldown({
				input,
				external: [
					// dependencies could have deep exports, so we need a regex
					...Object.keys(pkg.dependencies || {}).map((d) => new RegExp(`^${d}(\\/.*)?$`))
				],
				platform: 'node',
				resolve: {
					conditionNames: ['node']
				},
				plugins: [
					{
						// resolve the app's server and manifest, generated above
						name: 'adapter-node-resolve-app',
						resolveId(id) {
							if (id === 'SERVER') return `${server}/index.js`;
							if (id === 'MANIFEST') return `${tmp}/manifest.js`;
						}
					},
					{
						// replace build-time constants in the adapter's own entrypoints
						// only, so that identifiers in the app or its dependencies aren't
						// accidentally replaced
						name: 'adapter-node-replace-constants',
						transform: {
							filter: { id: new RegExp(escape_regex(entries)) },
							handler(code) {
								return code
									.replace(/\bENV_PREFIX\b/g, JSON.stringify(envPrefix))
									.replace(/\bPRECOMPRESS\b/g, JSON.stringify(precompress));
							}
						}
					}
				]
			});

			const server_path_length = server.length + 1;

			await bundle.write({
				dir: out,
				format: 'esm',
				sourcemap: true,
				chunkFileNames: 'server/chunks/[name]-[hash].js',
				// force the Vite server output to retain their file structure to avoid
				// a circular import chain
				// see https://github.com/sveltejs/kit/issues/16092
				manualChunks(id) {
					if (id.startsWith(server)) {
						return id.slice(server_path_length);
					}
				}
			});

			if (builder.hasServerInstrumentationFile()) {
				builder.instrument({
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
