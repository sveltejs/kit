import { writeFileSync } from 'fs';
import { posix } from 'path';
import { fileURLToPath } from 'url';
import * as esbuild from 'esbuild';

/** @type {import('.').default} */
export default function () {
	return {
		name: '@sveltejs/adapter-cloudflare',
		async adapt(builder) {
			const files = fileURLToPath(new URL('./files', import.meta.url).href);
			const dest = builder.getBuildDirectory('cloudflare');
			const tmp = builder.getBuildDirectory('cloudflare-tmp');

			builder.rimraf(dest);
			builder.rimraf(tmp);
			builder.mkdirp(tmp);

			const dest_dir = `${dest}${builder.config.kit.paths.base}`;
			const written_files = builder.writeClient(dest_dir);
			builder.writePrerendered(dest_dir);

			const relativePath = posix.relative(tmp, builder.getServerDirectory());

			builder.log.info(
				`adapter-cloudfare is writing its own _headers file. If you have your own, you should duplicate the headers contained in: ${dest}/_headers`
			);

			writeFileSync(
				`${tmp}/manifest.js`,
				`export const manifest = ${builder.generateManifest({ relativePath })};\n\n` +
					`export const prerendered = new Set(${JSON.stringify(builder.prerendered.paths)});\n`
			);

			writeFileSync(
				`${dest}/_routes.json`,
				JSON.stringify(get_routes_json(builder, written_files))
			);

			writeFileSync(`${dest}/_headers`, generate_headers(builder.config.kit.appDir));

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
				target: 'es2020',
				entryPoints: [`${tmp}/_worker.js`],
				outfile: `${dest}/_worker.js`,
				allowOverwrite: true,
				format: 'esm',
				bundle: true,
				minify: true
			});
		}
	};
}

/**
 * @param {import('@sveltejs/kit').Builder} builder
 * @param {string[]} assets
 * @returns {import('.').RoutesJSONSpec}
 */
function get_routes_json(builder, assets) {
	/**
	 * The list of routes that will _not_ invoke functions (which cost money).
	 * This is done on a best-effort basis, as there is a limit of 100 rules
	 */
	const exclude = [
		`/${builder.config.kit.appDir}/*`,
		...assets
			.filter((file) => !file.startsWith(`${builder.config.kit.appDir}/`))
			.map((file) => `/${file}`)
	];

	const MAX_EXCLUSIONS = 99; // 100 minus existing `include` rules
	let excess;

	if (exclude.length > MAX_EXCLUSIONS) {
		excess = 'static assets';

		if (builder.prerendered.paths.length > 0) {
			excess += ' or prerendered routes';
		}
	} else if (exclude.length + builder.prerendered.paths.length > MAX_EXCLUSIONS) {
		excess = 'prerendered routes';
	}

	for (const path of builder.prerendered.paths) {
		if (!builder.prerendered.redirects.has(path)) {
			exclude.push(path);
		}
	}

	if (excess) {
		const message = `Static file count exceeds _routes.json limits (see https://developers.cloudflare.com/pages/platform/functions/routing/#limits). Accessing some ${excess} will cause function invocations.`;
		builder.log.warn(message);
		exclude.length = 99;
	}

	return {
		version: 1,
		description: 'Generated by @sveltejs/adapter-cloudflare',
		include: ['/*'],
		exclude
	};
}

/** @param {string} app_dir */
function generate_headers(app_dir) {
	return `
# === START AUTOGENERATED SVELTE IMMUTABLE HEADERS ===
/${app_dir}/immutable/*
	Cache-Control: public, immutable, max-age=31536000
	X-Robots-Tag: noindex
# === END AUTOGENERATED SVELTE IMMUTABLE HEADERS ===
	`.trim();
}
