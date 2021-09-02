import { execSync } from 'child_process';
import fs from 'fs';
import { fileURLToPath } from 'url';

import toml from '@iarna/toml';
import { appResolver } from '@sveltejs/kit/adapter';
import esbuild from 'esbuild';

/**
 * @typedef {import('esbuild').BuildOptions} BuildOptions
 */

/** @type {import('.')} */
export default function (options) {
	return {
		name: '@sveltejs/adapter-cloudflare-workers',

		async adapt({ utils }) {
			const { site } = validate_config(utils);

			const bucket = site.bucket;
			const entrypoint = site['entry-point'] || 'workers-site';

			const files = fileURLToPath(new URL('./files', import.meta.url));

			utils.rimraf(bucket);
			utils.rimraf(entrypoint);

			utils.log.info('Installing worker dependencies...');
			utils.copy(`${files}/_package.json`, '.svelte-kit/cloudflare-workers/package.json');

			// TODO would be cool if we could make this step unnecessary somehow
			const stdout = execSync('npm install', { cwd: '.svelte-kit/cloudflare-workers' });
			utils.log.info(stdout.toString());

			utils.log.minor('Generating worker...');
			utils.copy(`${files}/entry.js`, '.svelte-kit/cloudflare-workers/entry.js');

			/** @type {BuildOptions} */
			const default_options = {
				entryPoints: ['.svelte-kit/cloudflare-workers/entry.js'],
				outfile: `${entrypoint}/index.js`,
				bundle: true,
				target: 'es2020',
				platform: 'browser',
				plugins: [appResolver()]
			};

			const build_options =
				options && options.esbuild ? await options.esbuild(default_options) : default_options;

			await esbuild.build(build_options);

			fs.writeFileSync(`${entrypoint}/package.json`, JSON.stringify({ main: 'index.js' }));

			utils.log.info('Prerendering static pages...');
			await utils.prerender({
				dest: bucket
			});

			utils.log.minor('Copying assets...');
			utils.copy_static_files(bucket);
			utils.copy_client_files(bucket);
		}
	};
}

function validate_config(utils) {
	if (fs.existsSync('wrangler.toml')) {
		let wrangler_config;

		try {
			wrangler_config = toml.parse(fs.readFileSync('wrangler.toml', 'utf-8'));
		} catch (err) {
			err.message = `Error parsing wrangler.toml: ${err.message}`;
			throw err;
		}

		if (!wrangler_config.site || !wrangler_config.site.bucket) {
			throw new Error(
				'You must specify site.bucket in wrangler.toml. Consult https://developers.cloudflare.com/workers/platform/sites/configuration'
			);
		}

		return wrangler_config;
	}

	utils.log.error(
		'Consult https://developers.cloudflare.com/workers/platform/sites/configuration on how to setup your site'
	);

	utils.log(
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
