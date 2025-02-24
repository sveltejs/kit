import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { rollup } from 'rollup';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
// TODO 3.0: switch to named imports, right now we're doing `import * as ..` to avoid having to bump the peer dependency on Kit
import * as kit from '@sveltejs/kit';

const [major, minor] = kit.VERSION.split('.').map(Number);
const can_use_middleware = major > 2 || (major === 2 && minor > 17);

/** @type {string | null} */
let middleware_path = can_use_middleware ? 'src/node-middleware.js' : null;
if (middleware_path && !existsSync(middleware_path)) {
	middleware_path = 'src/node-middleware.ts';
	if (!existsSync(middleware_path)) middleware_path = null;
}

const files = fileURLToPath(new URL('./files', import.meta.url).href);

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

			builder.writeServer(tmp);

			writeFileSync(
				`${tmp}/manifest.js`,
				[
					`export const manifest = ${builder.generateManifest({ relativePath: './' })};`,
					`export const prerendered = new Set(${JSON.stringify(builder.prerendered.paths)});`,
					`export const base = ${JSON.stringify(builder.config.kit.paths.base)};`
				].join('\n\n')
			);

			if (middleware_path) {
				builder.copy(`${files}/middleware.js`, `${tmp}/adapter/node-middleware-wrapper.js`, {
					replace: {
						MIDDLEWARE: './node-middleware.js'
					}
				});
			} else {
				builder.mkdirp(`${tmp}/adapter`);
				writeFileSync(
					`${tmp}/adapter/node-middleware-wrapper.js`,
					'export default (req, res, next) => next();'
				);
			}

			const pkg = JSON.parse(readFileSync('package.json', 'utf8'));

			// we bundle the Vite output so that deployments only need
			// their production dependencies. Anything in devDependencies
			// will get included in the bundled code
			const bundle = await rollup({
				input: {
					index: `${tmp}/index.js`,
					manifest: `${tmp}/manifest.js`,
					'node-middleware': `${tmp}/adapter/node-middleware-wrapper.js`
				},
				external: [
					// dependencies could have deep exports, so we need a regex
					...Object.keys(pkg.dependencies || {}).map((d) => new RegExp(`^${d}(\\/.*)?$`))
				],
				plugins: [
					nodeResolve({
						preferBuiltins: true,
						exportConditions: ['node']
					}),
					// @ts-ignore https://github.com/rollup/plugins/issues/1329
					commonjs({ strictRequires: true }),
					// @ts-ignore https://github.com/rollup/plugins/issues/1329
					json()
				]
			});

			await bundle.write({
				dir: `${out}/server`,
				format: 'esm',
				sourcemap: true,
				chunkFileNames: 'chunks/[name]-[hash].js'
			});

			builder.copy(files, out, {
				filter: (file) => file !== 'middleware.js',
				replace: {
					ENV: './env.js',
					HANDLER: './handler.js',
					MANIFEST: './server/manifest.js',
					SERVER: './server/index.js',
					SHIMS: './shims.js',
					ENV_PREFIX: JSON.stringify(envPrefix),
					MIDDLEWARE: './server/node-middleware.js'
				}
			});
		},

		emulate: (opts) => {
			if (!middleware_path) return {};

			return {
				beforeRequest: async (req, res, next) => {
					// We have to import this here or else we wouldn't notice when the middleware file changes
					const middleware = await opts.importEntryPoint('node-middleware');

					const { url, denormalize } = kit.normalizeUrl(req.url);
					req.url = url.pathname + url.search;
					const _next = () => {
						const { pathname, search } = denormalize(req.url);
						req.url = pathname + search;
						return next();
					};

					return middleware.default(req, res, _next);
				}
			};
		},

		additionalEntryPoints: { 'node-middleware': middleware_path },

		supports: {
			read: () => true
		}
	};
}
