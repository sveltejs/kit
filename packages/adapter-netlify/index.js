/** @import { BuildOptions } from 'esbuild' */
import { appendFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { builtinModules } from 'node:module';
import process from 'node:process';
import esbuild from 'esbuild';
import toml from '@iarna/toml';
import { VERSION } from '@sveltejs/kit';

const [kit_major, kit_minor] = VERSION.split('.');

/**
 * @typedef {{
 *   build?: { publish?: string }
 *   functions?: { node_bundler?: 'zisi' | 'esbuild' }
 * } & toml.JsonMap} NetlifyConfig
 */

/**
 * @template T
 * @template {keyof T} K
 * @typedef {Partial<Omit<T, K>> & Required<Pick<T, K>>} PartialExcept
 */

/**
 * We use a custom `Builder` type here to support the minimum version of SvelteKit.
 * @typedef {PartialExcept<import('@sveltejs/kit').Builder, 'log' | 'rimraf' | 'mkdirp' | 'config' | 'prerendered' | 'routes' | 'createEntries' | 'findServerAssets' | 'generateFallback' | 'generateEnvModule' | 'generateManifest' | 'getBuildDirectory' | 'getClientDirectory' | 'getServerDirectory' | 'getAppPath' | 'writeClient' | 'writePrerendered' | 'writePrerendered' | 'writeServer' | 'copy' | 'compress'>} Builder2_4_0
 */

const name = '@sveltejs/adapter-netlify';
const files = fileURLToPath(new URL('./files', import.meta.url).href);

const edge_set_in_env_var =
	process.env.NETLIFY_SVELTEKIT_USE_EDGE === 'true' ||
	process.env.NETLIFY_SVELTEKIT_USE_EDGE === '1';

const FUNCTION_PREFIX = 'sveltekit-';

/** @type {import('./index.js').default} */
export default function ({ split = false, edge = edge_set_in_env_var } = {}) {
	return {
		name,
		/** @param {Builder2_4_0} builder */
		async adapt(builder) {
			if (!builder.routes) {
				throw new Error(
					'@sveltejs/adapter-netlify >=2.x (possibly installed through @sveltejs/adapter-auto) requires @sveltejs/kit version 1.5 or higher. ' +
						'Either downgrade the adapter or upgrade @sveltejs/kit'
				);
			}

			if (existsSync(`${builder.config.kit.files.assets}/_headers`)) {
				throw new Error(
					`The _headers file should be placed in the project root rather than the ${builder.config.kit.files.assets} directory`
				);
			}

			if (existsSync(`${builder.config.kit.files.assets}/_redirects`)) {
				throw new Error(
					`The _redirects file should be placed in the project root rather than the ${builder.config.kit.files.assets} directory`
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

			if (edge) {
				if (split) {
					throw new Error('Cannot use `split: true` alongside `edge: true`');
				}

				await generate_edge_functions({ builder });
			} else {
				generate_lambda_functions({ builder, split, publish });
			}
		},

		supports: {
			read: ({ route }) => {
				// TODO bump peer dep in next adapter major to simplify this
				if (edge && kit_major === '2' && kit_minor < '25') {
					throw new Error(
						`${name}: Cannot use \`read\` from \`$app/server\` in route \`${route.id}\` when using edge functions and SvelteKit < 2.25.0`
					);
				}

				return true;
			},
			instrumentation: () => true
		}
	};
}
/**
 * @param { object } params
 * @param {Builder2_4_0} params.builder
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

	const manifest = builder.generateManifest({
		relativePath
	});

	writeFileSync(`${tmp}/manifest.js`, `export const manifest = ${manifest};\n`);

	/** @type {{ assets: Set<string> }} */
	// we have to prepend the file:// protocol because Windows doesn't support absolute path imports
	const { assets } = (await import(`file://${tmp}/manifest.js`)).manifest;

	const path = '/*';
	// We only need to specify paths without the trailing slash because
	// Netlify will handle the optional trailing slash for us
	const excluded = [
		// Contains static files
		`/${builder.getAppPath()}/immutable/*`,
		`/${builder.getAppPath()}/version.json`,
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
		}),
		// Should not be served by SvelteKit at all
		'/.netlify/*'
	];

	/** @type {import('@netlify/edge-functions').Manifest} */
	const edge_manifest = {
		functions: [
			{
				function: 'render',
				path,
				excludedPath: /** @type {`/${string}`[]} */ (excluded)
			}
		],
		version: 1
	};

	/** @type {BuildOptions} */
	const esbuild_config = {
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
	};
	await Promise.all([
		esbuild.build({
			entryPoints: [`${tmp}/entry.js`],
			outfile: '.netlify/edge-functions/render.js',
			...esbuild_config
		}),
		builder.hasServerInstrumentationFile?.() &&
			esbuild.build({
				entryPoints: [`${builder.getServerDirectory()}/instrumentation.server.js`],
				outfile: '.netlify/edge/instrumentation.server.js',
				...esbuild_config
			})
	]);

	if (builder.hasServerInstrumentationFile?.()) {
		builder.instrument?.({
			entrypoint: '.netlify/edge-functions/render.js',
			instrumentation: '.netlify/edge/instrumentation.server.js',
			start: '.netlify/edge/start.js'
		});
	}

	writeFileSync('.netlify/edge-functions/manifest.json', JSON.stringify(edge_manifest));
}
/**
 * @param { object } params
 * @param {Builder2_4_0} params.builder
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

	builder.copy(files, '.netlify', { replace });

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
			if (builder.hasServerInstrumentationFile?.()) {
				builder.instrument?.({
					entrypoint: `.netlify/functions-internal/${name}.mjs`,
					instrumentation: '.netlify/server/instrumentation.server.js',
					start: `.netlify/functions-start/${name}.start.mjs`,
					module: {
						exports: ['handler']
					}
				});
			}

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
		if (builder.hasServerInstrumentationFile?.()) {
			builder.instrument?.({
				entrypoint: `.netlify/functions-internal/${FUNCTION_PREFIX}render.mjs`,
				instrumentation: '.netlify/server/instrumentation.server.js',
				start: `.netlify/functions-start/${FUNCTION_PREFIX}render.start.mjs`,
				module: {
					exports: ['handler']
				}
			});
		}

		redirects.push(`* /.netlify/functions/${FUNCTION_PREFIX}render 200`);
	}

	// this should happen at the end, after builder.writeClient(...),
	// so that generated redirects are appended to custom redirects
	// rather than replaced by them
	builder.log.minor('Writing redirects...');
	const redirects_file = join(publish, '_redirects');
	if (existsSync('_redirects')) {
		builder.copy('_redirects', redirects_file);
	}
	builder.mkdirp(dirname(redirects_file));
	appendFileSync(redirects_file, `\n\n${redirects.join('\n')}`);
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
 * @param {NetlifyConfig | null} netlify_config
 * @param {Builder2_4_0} builder
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
