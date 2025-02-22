import { appendFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { builtinModules } from 'node:module';
import process from 'node:process';
import esbuild from 'esbuild';
import toml from '@iarna/toml';
// TODO 3.0: switch to named imports, right now we're doing `import * as ..` to avoid having to bump the peer dependency on Kit
import * as kit from '@sveltejs/kit';
import * as node_kit from '@sveltejs/kit/node';

/**
 * @typedef {{
 *   build?: { publish?: string }
 *   functions?: { node_bundler?: 'zisi' | 'esbuild' }
 * } & toml.JsonMap} NetlifyConfig
 */

/**
 * TODO(serhalp) Replace this custom type with an import from `@netlify/edge-functions`,
 * once that type is fixed to include `excludedPath` and `function`.
 * @typedef {{
 *	 functions: Array<
 *		 | {
 *				 function: string;
 *				 path: string;
 *				 excludedPath?: string | string[];
 *		   }
 *		 | {
 *				 function: string;
 *				 pattern: string;
 *				 excludedPattern?: string | string[];
 *		   }
 *	 >;
 *	 version: 1;
 *	 }} HandlerManifest
 */

const name = '@sveltejs/adapter-netlify';
const files = fileURLToPath(new URL('./files', import.meta.url).href);

const edge_set_in_env_var =
	process.env.NETLIFY_SVELTEKIT_USE_EDGE === 'true' ||
	process.env.NETLIFY_SVELTEKIT_USE_EDGE === '1';

const FUNCTION_PREFIX = 'sveltekit-';

const [major, minor] = kit.VERSION.split('.').map(Number);
const can_use_middleware = major > 2 || (major === 2 && minor > 17);

/** @type {string | null} */
let middleware_path = can_use_middleware ? 'edge-middleware.js' : null;
if (middleware_path && !existsSync(middleware_path)) {
	middleware_path = 'edge-middleware.ts';
	if (!existsSync(middleware_path)) middleware_path = null;
}

/** @type {import('./index.js').default} */
export default function ({ split = false, edge = edge_set_in_env_var } = {}) {
	return {
		name,

		async adapt(builder) {
			if (!builder.routes) {
				throw new Error(
					'@sveltejs/adapter-netlify >=2.x (possibly installed through @sveltejs/adapter-auto) requires @sveltejs/kit version 1.5 or higher. ' +
						'Either downgrade the adapter or upgrade @sveltejs/kit'
				);
			}

			const netlify_config = get_netlify_config();

			// "build" is the default publish directory when Netlify detects SvelteKit
			const publish = get_publish_directory(netlify_config, builder) || 'build';

			// empty out existing build directories
			builder.rimraf(publish);
			builder.rimraf('.netlify/edge-functions');
			builder.rimraf('.netlify/server');
			builder.rimraf('.netlify/package.json');
			builder.rimraf('.netlify/serverless.js');

			if (existsSync('.netlify/functions-internal')) {
				for (const file of readdirSync('.netlify/functions-internal')) {
					if (file.startsWith(FUNCTION_PREFIX)) {
						builder.rimraf(join('.netlify/functions-internal', file));
					}
				}
			}

			builder.log.minor(`Publishing to "${publish}"`);

			builder.log.minor('Copying assets...');
			const publish_dir = `${publish}${builder.config.kit.paths.base}`;
			builder.writeClient(publish_dir);
			builder.writePrerendered(publish_dir);

			builder.log.minor('Writing custom headers...');
			const headers_file = join(publish, '_headers');
			builder.copy('_headers', headers_file);
			appendFileSync(
				headers_file,
				`\n\n/${builder.getAppPath()}/immutable/*\n  cache-control: public\n  cache-control: immutable\n  cache-control: max-age=31536000\n`
			);

			if (middleware_path) {
				await generate_edge_middleware({ builder });
			}

			if (edge) {
				if (split) {
					throw new Error('Cannot use `split: true` alongside `edge: true`');
				}

				await generate_edge_functions({ builder });
			} else {
				generate_lambda_functions({ builder, split, publish });
			}
		},

		emulate: (opts) => {
			if (!middleware_path) return {};

			return {
				beforeRequest: async (req, res, next) => {
					// We have to import this here or else we wouldn't notice when the middleware file changes
					const middleware = await opts.importEntryPoint('edge-middleware');

					const { url, denormalize } = kit.normalizeUrl(req.url);

					const request = new Request(url, {
						headers: node_kit.getRequestHeaders(req),
						method: req.method,
						body:
							// We omit the body here because it would consume the stream
							req.method === 'GET' || req.method === 'HEAD' || !req.headers['content-type']
								? undefined
								: 'Cannot read body in dev mode'
					});

					// Netlify allows you to modify the response object after calling next().
					// This isn't replicable using Vite or Polka middleware, so we approximate it.
					const fake_response = new Response();

					const response = await middleware.default(request, {
						// approximation of the Netlify context object
						// https://docs.netlify.com/edge-functions/api/
						account: { id: null },
						cookies: {
							/** @param {string} name */
							get: (name) =>
								req.headers.cookie
									?.split(';')
									.find((c) => c.trim().startsWith(`${name}=`))
									?.split('=')[1],
							/** @param {string} name @param {string} value */
							set: (name, value) => res.appendHeader('Set-Cookie', `${name}=${value}`),
							/** @param {string} name */
							delete: (name) => res.appendHeader('Set-Cookie', `${name}=; Max-Age=0`)
						},
						deploy: {
							context: null,
							id: null,
							published: null
						},
						geo: {
							city: null,
							country: { code: null, name: null },
							latitude: null,
							longitude: null,
							subdivision: { code: null, name: null },
							timezone: null,
							postalCode: null
						},
						ip: null,
						params: {},
						requestId: null,
						site: {
							id: null,
							name: null,
							url: null
						},
						/** @param {any} request */
						next: (request) => {
							if (request instanceof Request) {
								const new_url = denormalize(request.url);
								req.url = new_url.pathname + url.search;
								for (const header of request.headers) {
									req.headers[header[0]] = header[1];
								}
							}

							return fake_response;
						}
					});

					for (const header of fake_response.headers) {
						res.setHeader(header[0], header[1]);
					}

					if (response instanceof URL) {
						// https://docs.netlify.com/edge-functions/api/#return-a-rewrite
						const new_url = denormalize(response);
						req.url = new_url.pathname + new_url.search;
						return next();
					} else if (response instanceof Response && response !== fake_response) {
						// We assume that middleware bails out when returning a custom response
						return node_kit.setResponse(res, response);
					} else {
						return next();
					}
				}
			};
		},

		additionalEntryPoints: { 'edge-middleware': middleware_path },

		supports: {
			// reading from the filesystem only works in serverless functions
			read: ({ route, entry }) => {
				if (edge || entry === 'edge-middleware') {
					throw new Error(
						`${name}: Cannot use \`read\` from \`$app/server\` in route \`${route.id}\` when using edge functions`
					);
				}

				return true;
			}
		}
	};
}
/**
 * @param { object } params
 * @param {import('@sveltejs/kit').Builder} params.builder
 */
async function generate_edge_functions({ builder }) {
	const tmp = builder.getBuildDirectory('netlify-tmp');
	builder.rimraf(tmp);
	builder.mkdirp(tmp);

	builder.mkdirp('.netlify/edge-functions');

	builder.log.minor('Generating Edge Function...');

	const relativePath = posix.relative(tmp, builder.getServerDirectory());

	builder.copy(`${files}/edge.js`, `${tmp}/entry.js`, {
		replace: {
			'0SERVER': `${relativePath}/index.js`,
			MANIFEST: './manifest.js'
		}
	});

	const manifest = builder.generateManifest({ relativePath });
	writeFileSync(`${tmp}/manifest.js`, `export const manifest = ${manifest};\n`);

	/** @type {{ assets: Set<string> }} */
	const { assets } = (await import(`${tmp}/manifest.js`)).manifest;

	await bundle_edge_function({
		builder,
		name: 'render',
		path: '/*',
		excludedPath: [
			...builder.prerendered.paths,
			...Array.from(assets).flatMap((asset) => {
				if (asset.endsWith('/index.html')) {
					const dir = asset.replace(/\/index\.html$/, '');
					return [
						`${builder.config.kit.paths.base}/${asset}`,
						`${builder.config.kit.paths.base}/${dir}`
					];
				}
				return `${builder.config.kit.paths.base}/${asset}`;
			})
		]
	});
}

/**
 * @param {object} params
 * @param {import('@sveltejs/kit').Builder} params.builder
 */
async function generate_edge_middleware({ builder }) {
	const tmp = builder.getBuildDirectory('netlify-tmp');
	builder.rimraf(tmp);
	builder.mkdirp(tmp);

	builder.mkdirp('.netlify/edge-functions');

	builder.log.minor('Generating Edge Middleware...');

	const relativePath = posix.relative(tmp, builder.getServerDirectory());

	builder.copy(`${files}/middleware.js`, `${tmp}/entry.js`, {
		replace: {
			SERVER_INIT: `${relativePath}/init.js`,
			MIDDLEWARE: `${relativePath}/adapter/edge-middleware.js`
		}
	});

	await bundle_edge_function({ builder, name: 'edge-middleware', path: '/*', excludedPath: [] });
}

/**
 * @param {object} params
 * @param {import('@sveltejs/kit').Builder} params.builder
 * @param {string} params.name
 * @param {string} params.path
 * @param {string[]} params.excludedPath
 */
async function bundle_edge_function({ builder, name, path, excludedPath }) {
	const tmp = builder.getBuildDirectory('netlify-tmp');

	await esbuild.build({
		entryPoints: [`${tmp}/entry.js`],
		outfile: `.netlify/edge-functions/${name}.js`,
		bundle: true,
		format: 'esm',
		platform: 'browser',
		sourcemap: 'linked',
		target: 'es2020',
		loader: {
			'.wasm': 'copy',
			'.woff': 'copy',
			'.woff2': 'copy',
			'.ttf': 'copy',
			'.eot': 'copy',
			'.otf': 'copy'
		},
		// Node built-ins are allowed, but must be prefixed with `node:`
		// https://docs.netlify.com/edge-functions/api/#runtime-environment
		external: builtinModules.map((id) => `node:${id}`),
		alias: Object.fromEntries(builtinModules.map((id) => [id, `node:${id}`]))
	});

	/** @type {HandlerManifest} */
	const edge_manifest = {
		functions: [
			...(existsSync('.netlify/edge-functions/manifest.json')
				? JSON.parse(readFileSync('.netlify/edge-functions/manifest.json', 'utf-8')).functions
				: []),
			{
				function: name,
				path,
				// We only need to specify paths without the trailing slash because
				// Netlify will handle the optional trailing slash for us
				excludedPath: [
					// Contains static files
					`/${builder.getAppPath()}/*`,
					...excludedPath,
					// Should not be served by SvelteKit at all
					'/.netlify/*'
				]
			}
		],
		version: 1
	};

	writeFileSync('.netlify/edge-functions/manifest.json', JSON.stringify(edge_manifest));
}

/**
 * @param { object } params
 * @param {import('@sveltejs/kit').Builder} params.builder
 * @param { string } params.publish
 * @param { boolean } params.split
 */
function generate_lambda_functions({ builder, publish, split }) {
	builder.mkdirp('.netlify/functions-internal/.svelte-kit');

	/** @type {string[]} */
	const redirects = [];
	builder.writeServer('.netlify/server');

	const replace = {
		'0SERVER': './server/index.js' // digit prefix prevents CJS build from using this as a variable name, which would also get replaced
	};

	builder.copy(`${files}/esm`, '.netlify', { replace });

	// Configuring the function to use ESM as the output format.
	const fn_config = JSON.stringify({ config: { nodeModuleFormat: 'esm' }, version: 1 });

	builder.log.minor('Generating serverless functions...');

	if (split) {
		const seen = new Set();

		for (let i = 0; i < builder.routes.length; i++) {
			const route = builder.routes[i];
			if (route.prerender === true) continue;

			const routes = [route];

			const parts = [];
			// Netlify's syntax uses '*' and ':param' as "splats" and "placeholders"
			// https://docs.netlify.com/routing/redirects/redirect-options/#splats
			for (const segment of route.segments) {
				if (segment.rest) {
					parts.push('*');
					break; // Netlify redirects don't allow anything after a *
				} else if (segment.dynamic) {
					parts.push(`:${parts.length}`);
				} else {
					parts.push(segment.content);
				}
			}

			const pattern = `/${parts.join('/')}`;
			const name =
				FUNCTION_PREFIX + (parts.join('-').replace(/[:.]/g, '_').replace('*', '__rest') || 'index');

			// skip routes with identical patterns, they were already folded into another function
			if (seen.has(pattern)) continue;
			seen.add(pattern);

			// figure out which lower priority routes should be considered fallbacks
			for (let j = i + 1; j < builder.routes.length; j += 1) {
				const other = builder.routes[j];
				if (other.prerender === true) continue;

				if (matches(route.segments, other.segments)) {
					routes.push(other);
				}
			}

			const manifest = builder.generateManifest({
				relativePath: '../server',
				routes
			});

			const fn = `import { init } from '../serverless.js';\n\nexport const handler = init(${manifest});\n`;

			writeFileSync(`.netlify/functions-internal/${name}.mjs`, fn);
			writeFileSync(`.netlify/functions-internal/${name}.json`, fn_config);

			const redirect = `/.netlify/functions/${name} 200`;
			redirects.push(`${pattern} ${redirect}`);
			redirects.push(`${pattern === '/' ? '' : pattern}/__data.json ${redirect}`);
		}
	} else {
		const manifest = builder.generateManifest({
			relativePath: '../server'
		});

		const fn = `import { init } from '../serverless.js';\n\nexport const handler = init(${manifest});\n`;

		writeFileSync(`.netlify/functions-internal/${FUNCTION_PREFIX}render.json`, fn_config);
		writeFileSync(`.netlify/functions-internal/${FUNCTION_PREFIX}render.mjs`, fn);
		redirects.push(`* /.netlify/functions/${FUNCTION_PREFIX}render 200`);
	}

	// this should happen at the end, after builder.writeClient(...),
	// so that generated redirects are appended to custom redirects
	// rather than replaced by them
	builder.log.minor('Writing redirects...');
	const redirect_file = join(publish, '_redirects');
	if (existsSync('_redirects')) {
		builder.copy('_redirects', redirect_file);
	}
	builder.mkdirp(dirname(redirect_file));
	appendFileSync(redirect_file, `\n\n${redirects.join('\n')}`);
}

function get_netlify_config() {
	if (!existsSync('netlify.toml')) return null;

	try {
		return /** @type {NetlifyConfig} */ (toml.parse(readFileSync('netlify.toml', 'utf-8')));
	} catch (err) {
		err.message = `Error parsing netlify.toml: ${err.message}`;
		throw err;
	}
}

/**
 * @param {NetlifyConfig} netlify_config
 * @param {import('@sveltejs/kit').Builder} builder
 **/
function get_publish_directory(netlify_config, builder) {
	if (netlify_config) {
		if (!netlify_config.build?.publish) {
			builder.log.minor('No publish directory specified in netlify.toml, using default');
			return;
		}

		if (netlify_config.redirects) {
			throw new Error(
				"Redirects are not supported in netlify.toml. Use _redirects instead. For more details consult the readme's troubleshooting section."
			);
		}
		if (resolve(netlify_config.build.publish) === process.cwd()) {
			throw new Error(
				'The publish directory cannot be set to the site root. Please change it to another value such as "build" in netlify.toml.'
			);
		}
		return netlify_config.build.publish;
	}

	builder.log.warn(
		'No netlify.toml found. Using default publish directory. Consult https://svelte.dev/docs/kit/adapter-netlify#usage for more details'
	);
}

/**
 * @typedef {{ rest: boolean, dynamic: boolean, content: string }} RouteSegment
 */

/**
 * @param {RouteSegment[]} a
 * @param {RouteSegment[]} b
 * @returns {boolean}
 */
function matches(a, b) {
	if (a[0] && b[0]) {
		if (b[0].rest) {
			if (b.length === 1) return true;

			const next_b = b.slice(1);

			for (let i = 0; i < a.length; i += 1) {
				if (matches(a.slice(i), next_b)) return true;
			}

			return false;
		}

		if (!b[0].dynamic) {
			if (!a[0].dynamic && a[0].content !== b[0].content) return false;
		}

		if (a.length === 1 && b.length === 1) return true;
		return matches(a.slice(1), b.slice(1));
	} else if (a[0]) {
		return a.length === 1 && a[0].rest;
	} else {
		return b.length === 1 && b[0].rest;
	}
}
