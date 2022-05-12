import { existsSync, readFileSync, writeFileSync } from 'fs';
import { posix, dirname } from 'path';
import { execSync } from 'child_process';
import esbuild from 'esbuild';
import toml from '@iarna/toml';
import { fileURLToPath } from 'url';

/**
 * @typedef {{
 *   main: string;
 *   site: {
 *     bucket: string;
 *   }
 * }} WranglerConfig
 */

/** @type {import('.')} */
export default function (options = {}) {
	return {
		name: '@sveltejs/adapter-cloudflare-workers',

		async adapt(builder) {
			const { main, site } = validate_config(builder);

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

			writeFileSync(
				`${tmp}/manifest.js`,
				`export const manifest = ${builder.generateManifest({
					relativePath
				})};\n\nexport const prerendered = new Map(${JSON.stringify(
					Array.from(builder.prerendered.pages.entries())
				)});\n`
			);

			await esbuild.build({
				target: 'es2020',
				platform: 'browser',
				...options,
				entryPoints: [`${tmp}/entry.js`],
				outfile: main,
				bundle: true,
				external: ['__STATIC_CONTENT_MANIFEST', ...(options?.external || [])],
				format: 'esm'
			});

			builder.log.minor('Copying assets...');
			builder.writeClient(site.bucket);
			builder.writeStatic(site.bucket);
			builder.writePrerendered(site.bucket);
		}
	};
}

/**
 * @param {import('@sveltejs/kit').Builder} builder
 * @returns {WranglerConfig}
 */
function validate_config(builder) {
	if (existsSync('wrangler.toml')) {
		/** @type {WranglerConfig} */
		let wrangler_config;

		try {
			wrangler_config = /** @type {WranglerConfig} */ (
				toml.parse(readFileSync('wrangler.toml', 'utf-8'))
			);
		} catch (err) {
			err.message = `Error parsing wrangler.toml: ${err.message}`;
			throw err;
		}

		if (!wrangler_config.site?.bucket) {
			throw new Error(
				'You must specify site.bucket in wrangler.toml. Consult https://developers.cloudflare.com/workers/platform/sites/configuration'
			);
		}

		if (!wrangler_config.main) {
			throw new Error(
				'You must specify main option in wrangler.toml. Consult https://github.com/sveltejs/kit/tree/master/packages/adapter-cloudflare-workers'
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
		route = "<your-route>"

		main = "./.cloudflare/worker.js"
		site.bucket = "./.cloudflare/public"

		build.command = "npm run build"

		compatibility_date = "2021-11-12"
		workers_dev = true`
			.replace(/^\t+/gm, '')
			.trim()
	);

	throw new Error('Missing a wrangler.toml file');
}
