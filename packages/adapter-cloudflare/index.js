import { existsSync, writeFileSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { getPlatformProxy } from 'wrangler';

// list from https://developers.cloudflare.com/workers/runtime-apis/nodejs/
const compatible_node_modules = [
	'assert',
	'async_hooks',
	'buffer',
	'crypto',
	'diagnostics_channel',
	'events',
	'path',
	'process',
	'stream',
	'string_decoder',
	'util'
];

/** @type {import('./index.js').default} */
export default function (options = {}) {
	return {
		name: '@sveltejs/adapter-cloudflare',
		async adapt(builder) {
			if (existsSync('_routes.json')) {
				throw new Error(
					'Cloudflare routes should be configured in svelte.config.js rather than _routes.json'
				);
			}

			const files = fileURLToPath(new URL('./files', import.meta.url).href);
			const dest = builder.getBuildDirectory('cloudflare');
			const tmp = builder.getBuildDirectory('cloudflare-tmp');

			builder.rimraf(dest);
			builder.rimraf(tmp);

			builder.mkdirp(dest);
			builder.mkdirp(tmp);

			// generate plaintext 404.html first which can then be overridden by prerendering, if the user defined such a page
			const fallback = path.join(dest, '404.html');
			if (options.fallback === 'spa') {
				await builder.generateFallback(fallback);
			} else {
				writeFileSync(fallback, 'Not Found');
			}

			const dest_dir = `${dest}${builder.config.kit.paths.base}`;
			const written_files = builder.writeClient(dest_dir);
			builder.writePrerendered(dest_dir);

			const relativePath = path.posix.relative(tmp, builder.getServerDirectory());

			writeFileSync(
				`${tmp}/manifest.js`,
				`export const manifest = ${builder.generateManifest({ relativePath })};\n\n` +
					`export const prerendered = new Set(${JSON.stringify(builder.prerendered.paths)});\n\n` +
					`export const base_path = ${JSON.stringify(builder.config.kit.paths.base)};\n`
			);

			writeFileSync(
				`${dest}/_routes.json`,
				JSON.stringify(get_routes_json(builder, written_files, options.routes ?? {}), null, '\t')
			);

			writeFileSync(`${dest}/_headers`, generate_headers(builder.getAppPath()), { flag: 'a' });

			if (builder.prerendered.redirects.size > 0) {
				writeFileSync(`${dest}/_redirects`, generate_redirects(builder.prerendered.redirects), {
					flag: 'a'
				});
			}

			builder.copy(`${files}/worker.js`, `${tmp}/_worker.js`, {
				replace: {
					SERVER: `${relativePath}/index.js`,
					MANIFEST: './manifest.js'
				}
			});

			const external = ['cloudflare:*', ...compatible_node_modules.map((id) => `node:${id}`)];

			try {
				const result = await esbuild.build({
					platform: 'browser',
					// https://github.com/cloudflare/workers-sdk/blob/a12b2786ce745f24475174bcec994ad691e65b0f/packages/wrangler/src/deployment-bundle/bundle.ts#L35-L36
					conditions: ['workerd', 'worker', 'browser'],
					sourcemap: 'linked',
					target: 'es2022',
					entryPoints: [`${tmp}/_worker.js`],
					outfile: `${dest}/_worker.js`,
					allowOverwrite: true,
					format: 'esm',
					bundle: true,
					loader: {
						'.wasm': 'copy',
						'.woff': 'copy',
						'.woff2': 'copy',
						'.ttf': 'copy',
						'.eot': 'copy',
						'.otf': 'copy'
					},
					external,
					alias: Object.fromEntries(compatible_node_modules.map((id) => [id, `node:${id}`])),
					logLevel: 'silent'
				});

				if (result.warnings.length > 0) {
					const formatted = await esbuild.formatMessages(result.warnings, {
						kind: 'warning',
						color: true
					});

					console.error(formatted.join('\n'));
				}
			} catch (error) {
				for (const e of error.errors) {
					for (const node of e.notes) {
						const match =
							/The package "(.+)" wasn't found on the file system but is built into node/.exec(
								node.text
							);

						if (match) {
							node.text = `Cannot use "${match[1]}" when deploying to Cloudflare.`;
						}
					}
				}

				const formatted = await esbuild.formatMessages(error.errors, {
					kind: 'error',
					color: true
				});

				console.error(formatted.join('\n'));

				throw new Error(
					`Bundling with esbuild failed with ${error.errors.length} ${
						error.errors.length === 1 ? 'error' : 'errors'
					}`
				);
			}

			writeFileSync(`${dest}/.assetsignore`, generate_assetsignore(), { flag: 'a' });
		},
		async emulate() {
			const proxy = await getPlatformProxy(options.platformProxy);
			const platform = /** @type {App.Platform} */ ({
				env: proxy.env,
				context: proxy.ctx,
				caches: proxy.caches,
				cf: proxy.cf
			});

			/** @type {Record<string, any>} */
			const env = {};
			const prerender_platform = /** @type {App.Platform} */ (/** @type {unknown} */ ({ env }));

			for (const key in proxy.env) {
				Object.defineProperty(env, key, {
					get: () => {
						throw new Error(`Cannot access platform.env.${key} in a prerenderable route`);
					}
				});
			}

			return {
				platform: ({ prerender }) => {
					return prerender ? prerender_platform : platform;
				}
			};
		}
	};
}

/**
 * @param {import('@sveltejs/kit').Builder} builder
 * @param {string[]} assets
 * @param {import('./index.js').AdapterOptions['routes']} routes
 * @returns {import('./index.js').RoutesJSONSpec}
 */
function get_routes_json(builder, assets, { include = ['/*'], exclude = ['<all>'] }) {
	if (!Array.isArray(include) || !Array.isArray(exclude)) {
		throw new Error('routes.include and routes.exclude must be arrays');
	}

	if (include.length === 0) {
		throw new Error('routes.include must contain at least one route');
	}

	if (include.length > 100) {
		throw new Error('routes.include must contain 100 or fewer routes');
	}

	exclude = exclude
		.flatMap((rule) => (rule === '<all>' ? ['<build>', '<files>', '<prerendered>'] : rule))
		.flatMap((rule) => {
			if (rule === '<build>') {
				return `/${builder.getAppPath()}/*`;
			}

			if (rule === '<files>') {
				return assets
					.filter(
						(file) =>
							!(
								file.startsWith(`${builder.config.kit.appDir}/`) ||
								file === '_headers' ||
								file === '_redirects'
							)
					)
					.map((file) => `${builder.config.kit.paths.base}/${file}`);
			}

			if (rule === '<prerendered>') {
				return builder.prerendered.paths;
			}

			return rule;
		});

	const excess = include.length + exclude.length - 100;
	if (excess > 0) {
		const message = `Function includes/excludes exceeds _routes.json limits (see https://developers.cloudflare.com/pages/platform/functions/routing/#limits). Dropping ${excess} exclude rules — this will cause unnecessary function invocations.`;
		builder.log.warn(message);

		exclude.length -= excess;
	}

	return {
		version: 1,
		description: 'Generated by @sveltejs/adapter-cloudflare',
		include,
		exclude
	};
}

/** @param {string} app_dir */
function generate_headers(app_dir) {
	return `
# === START AUTOGENERATED SVELTE IMMUTABLE HEADERS ===
/${app_dir}/*
  X-Robots-Tag: noindex
	Cache-Control: no-cache
/${app_dir}/immutable/*
  ! Cache-Control
	Cache-Control: public, immutable, max-age=31536000
# === END AUTOGENERATED SVELTE IMMUTABLE HEADERS ===
`.trimEnd();
}

/** @param {Map<string, { status: number; location: string }>} redirects */
function generate_redirects(redirects) {
	const rules = Array.from(
		redirects.entries(),
		([path, redirect]) => `${path} ${redirect.location} ${redirect.status}`
	).join('\n');

	return `
# === START AUTOGENERATED SVELTE PRERENDERED REDIRECTS ===
${rules}
# === END AUTOGENERATED SVELTE PRERENDERED REDIRECTS ===
`.trimEnd();
}

function generate_assetsignore() {
	// this comes from https://github.com/cloudflare/workers-sdk/blob/main/packages/create-cloudflare/templates-experimental/svelte/templates/static/.assetsignore
	return `
_worker.js
_routes.json
_headers
_redirects
`;
}
