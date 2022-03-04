import { existsSync, readFileSync, writeFileSync } from 'fs';
import { posix } from 'path';
import { execSync } from 'child_process';
import esbuild from 'esbuild';
import toml from '@iarna/toml';
import { fileURLToPath } from 'url';

/** @type {import('.')} */
export default function () {
	return {
		name: '@sveltejs/adapter-cloudflare-workers',

		async adapt(builder) {
			const { site } = validate_config(builder);

			// @ts-ignore
			const { bucket } = site;

			// @ts-ignore
			const entrypoint = site['entry-point'] || 'workers-site';

			const files = fileURLToPath(new URL('./files', import.meta.url));
			const tmp = builder.getBuildDirectory('cloudflare-workers-tmp');

			builder.rimraf(bucket);
			builder.rimraf(entrypoint);

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
				})};\n\nexport const prerendered = new Set(${JSON.stringify(builder.prerendered.paths)});\n`
			);

			await esbuild.build({
				entryPoints: [`${tmp}/entry.js`],
				outfile: `${entrypoint}/index.js`,
				bundle: true,
				target: 'es2020',
				platform: 'browser'
			});

			writeFileSync(`${entrypoint}/package.json`, JSON.stringify({ main: 'index.js' }));

			builder.log.minor('Copying assets...');
			builder.writeClient(bucket);
			builder.writeStatic(bucket);
			builder.writePrerendered(bucket);
		}
	};
}

/** @param {import('@sveltejs/kit').Builder} builder */
function validate_config(builder) {
	if (existsSync('wrangler.toml')) {
		let wrangler_config;

		try {
			wrangler_config = toml.parse(readFileSync('wrangler.toml', 'utf-8'));
		} catch (err) {
			err.message = `Error parsing wrangler.toml: ${err.message}`;
			throw err;
		}

		// @ts-ignore
		if (!wrangler_config.site || !wrangler_config.site.bucket) {
			throw new Error(
				'You must specify site.bucket in wrangler.toml. Consult https://developers.cloudflare.com/workers/platform/sites/configuration'
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
		type = "javascript"
		account_id = "<your-account-id>"
		workers_dev = true
		route = ""
		zone_id = ""

		[site]
		bucket = "./.cloudflare/assets"
		entry-point = "./.cloudflare/worker"`
			.replace(/^\t+/gm, '')
			.trim()
	);

	throw new Error('Missing a wrangler.toml file');
}
