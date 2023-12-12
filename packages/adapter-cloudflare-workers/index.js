import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { posix, dirname } from 'node:path';
import { execSync } from 'node:child_process';
import esbuild from 'esbuild';
import toml from '@iarna/toml';
import { fileURLToPath } from 'node:url';

/**
 * @typedef {{
 *   main: string;
 *   site: {
 *     bucket: string;
 *   }
 * }} WranglerConfig
 */

/** @type {import('./index.js').default} */
export default function ({ config = 'wrangler.toml' } = {}) {
	return {
		name: '@sveltejs/adapter-cloudflare-workers',

		async adapt(builder) {
			const { main, site } = validate_config(builder, config);

			const files = fileURLToPath(new URL('./files', import.meta.url).href);
			const tmp = builder.getBuildDirectory('cloudflare-workers-tmp');

			builder.rimraf(site.bucket);
			builder.rimraf(dirname(main));

			builder.log.info('Installing worker dependencies...');
			builder.copy(`${files}/_package.json`, `${tmp}/package.json`);

			// TODO would be cool if we could make this step unnecessary somehow
			const stdout = execSync('npm install', { cwd: tmp });
			builder.log.info(stdout.toString());

			builder.log.minor('Generating worker...');
			const relativePath = posix.relative(tmp, builder.getServerDirectory());

			builder.copy(`${files}/entry.js`, `${tmp}/entry.js`, {
				replace: {
					SERVER: `${relativePath}/index.js`,
					MANIFEST: './manifest.js'
				}
			});

			let prerendered_entries = Array.from(builder.prerendered.pages.entries());

			if (builder.config.kit.paths.base) {
				prerendered_entries = prerendered_entries.map(([path, { file }]) => [
					path,
					{ file: `${builder.config.kit.paths.base}/${file}` }
				]);
			}

			writeFileSync(
				`${tmp}/manifest.js`,
				`export const manifest = ${builder.generateManifest({
					relativePath
				})};\n\nexport const prerendered = new Map(${JSON.stringify(prerendered_entries)});\n`
			);

			await esbuild.build({
				platform: 'browser',
				conditions: ['worker', 'browser'],
				sourcemap: 'linked',
				target: 'es2022',
				entryPoints: [`${tmp}/entry.js`],
				outfile: main,
				bundle: true,
				external: ['__STATIC_CONTENT_MANIFEST', 'cloudflare:*'],
				format: 'esm',
				loader: {
					'.wasm': 'copy'
				}
			});

			builder.log.minor('Copying assets...');
			const bucket_dir = `${site.bucket}${builder.config.kit.paths.base}`;
			builder.writeClient(bucket_dir);
			builder.writePrerendered(bucket_dir);
		}
	};
}

/**
 * @param {import('@sveltejs/kit').Builder} builder
 * @param {string} config_file
 * @returns {WranglerConfig}
 */
function validate_config(builder, config_file) {
	if (existsSync(config_file)) {
		/** @type {WranglerConfig} */
		let wrangler_config;

		try {
			wrangler_config = /** @type {WranglerConfig} */ (
				toml.parse(readFileSync(config_file, 'utf-8'))
			);
		} catch (err) {
			err.message = `Error parsing ${config_file}: ${err.message}`;
			throw err;
		}

		if (!wrangler_config.site?.bucket) {
			throw new Error(
				`You must specify site.bucket in ${config_file}. Consult https://developers.cloudflare.com/workers/platform/sites/configuration`
			);
		}

		if (!wrangler_config.main) {
			throw new Error(
				`You must specify main option in ${config_file}. Consult https://github.com/sveltejs/kit/tree/master/packages/adapter-cloudflare-workers`
			);
		}

		return wrangler_config;
	}

	builder.log.error(
		'Consult https://developers.cloudflare.com/workers/platform/sites/configuration on how to setup your site'
	);

	builder.log(
		`
		Sample wrangler.toml:

		name = "<your-site-name>"
		account_id = "<your-account-id>"

		main = "./.cloudflare/worker.js"
		site.bucket = "./.cloudflare/public"

		build.command = "npm run build"

		compatibility_date = "2021-11-12"
		workers_dev = true`
			.replace(/^\t+/gm, '')
			.trim()
	);

	throw new Error(`Missing a ${config_file} file`);
}
