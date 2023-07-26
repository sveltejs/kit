import { writeFileSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

/** @type {import('.').default} */
export default function (options = {}) {
	return {
		name: '@sveltejs/adapter-cloudflare',
		async adapt(builder) {
			const files = fileURLToPath(new URL('./files', import.meta.url).href);
			const dest = builder.getBuildDirectory('cloudflare');
			const tmp = builder.getBuildDirectory('cloudflare-tmp');

			builder.rimraf(dest);
			builder.rimraf(tmp);
			builder.mkdirp(tmp);

			// generate 404.html first which can then be overridden by prerendering, if the user defined such a page
			await builder.generateFallback(path.join(dest, '404.html'));

			const dest_dir = `${dest}${builder.config.kit.paths.base}`;
			const written_files = builder.writeClient(dest_dir);
			builder.writePrerendered(dest_dir);

			const relativePath = path.posix.relative(tmp, builder.getServerDirectory());
			writeFileSync(
				`${tmp}/manifest.js`,
				`export const manifest = ${builder.generateManifest({ relativePath })};\n\n` +
					`export const prerendered = new Set(${JSON.stringify(builder.prerendered.paths)});\n`
			);

			writeFileSync(
				`${dest}/_routes.json`,
				JSON.stringify(get_routes_json(builder, written_files, options.routes ?? {}), null, '\t')
			);

			writeFileSync(`${dest}/_headers`, generate_headers(builder.config.kit.appDir), { flag: 'a' });

			builder.copy(`${files}/worker.js`, `${tmp}/_worker.js`, {
				replace: {
					SERVER: `${relativePath}/index.js`,
					MANIFEST: './manifest.js'
				}
			});

			await esbuild.build({
				platform: 'browser',
				conditions: ['worker', 'browser'],
				sourcemap: 'linked',
				target: 'es2022',
				entryPoints: [`${tmp}/_worker.js`],
				outfile: `${dest}/_worker.js`,
				allowOverwrite: true,
				format: 'esm',
				bundle: true,
				loader: {
					'.wasm': 'copy'
				}
			});
		}
	};
}

/**
 * There's a limit of 100 rules. Take advantage of wildcards and generate as few file paths as possible
 * https://developers.cloudflare.com/pages/platform/functions/routing/#create-a-_routesjson-file
 *
 * @param {import('@sveltejs/kit').Builder} builder
 * @param {string} file_path
 */
function find_shallowest_exclude_pattern(builder, file_path) {
	const exclude_file_path = `/${file_path}`;
	const path_segments = file_path.split('/');
	if (path_segments.length === 0) {
		return file_path;
	}
	let exclude_pattern = exclude_file_path;
	// Exclude patterns can conflict with sveltekit routes, so don't wildcard paths in that case.
	for (let i = path_segments.length; i > 0; i--) {
		const path = `/${path_segments.slice(0, i).join('/')}`;
		// Test `dir/*` pattern against all sveltekit routes
		// The reason `%` is used is because it's an invalid character in a file path but valid in a route pattern
		const tmp_test_string = '%';
		const test_string = i === path_segments.length ? file_path : `${path}/${tmp_test_string}`;
		if (builder.routes.some((route) => route.pattern.test(test_string))) {
			break;
		}
		exclude_pattern = path;
	}

	return exclude_pattern === exclude_file_path ? exclude_pattern : `${exclude_pattern}/*`;
}
/**
 * @param {import('@sveltejs/kit').Builder} builder
 * @param {string[]} assets
 * @param {import('./index').AdapterOptions['routes']} routes
 * @returns {import('.').RoutesJSONSpec}
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
				return `/${builder.config.kit.appDir}/*`;
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
					.reduce((prev, file_path) => {
						const exclude_pattern = find_shallowest_exclude_pattern(builder, file_path);

						return prev.includes(exclude_pattern) ? prev : [...prev, exclude_pattern];
					}, []);
			}

			if (rule === '<prerendered>') {
				const prerendered = [];
				for (const path of builder.prerendered.paths) {
					if (!builder.prerendered.redirects.has(path)) {
						prerendered.push(path);
					}
				}

				return prerendered;
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
