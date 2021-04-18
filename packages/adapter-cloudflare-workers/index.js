'use strict';

const fs = require('fs');
const { execSync } = require('child_process');
const esbuild = require('esbuild');
const toml = require('toml');

module.exports = function () {
	/** @type {import('@sveltejs/kit').Adapter} */
	const adapter = {
		name: '@sveltejs/adapter-cloudflare-workers',
		async adapt(utils) {
			const { site } = validate_config(utils);

			const bucket = site.bucket;
			const entrypoint = site['entry-point'] || 'workers-site';

			utils.rimraf(bucket);
			utils.rimraf(entrypoint);

			utils.log.info('Installing worker dependencies...');
			utils.copy(`${__dirname}/files/_package.json`, '.svelte/cloudflare-workers/package.json');

			// TODO would be cool if we could make this step unnecessary somehow
			const stdout = execSync('npm install', { cwd: '.svelte/cloudflare-workers' });
			utils.log.info(stdout.toString());

			utils.log.minor('Generating worker...');
			utils.copy(`${__dirname}/files/entry.js`, '.svelte/cloudflare-workers/entry.js');

			await esbuild.build({
				entryPoints: ['.svelte/cloudflare-workers/entry.js'],
				outfile: `${entrypoint}/index.js`,
				bundle: true,
				platform: 'node'
			});

			utils.log.info('Prerendering static pages...');
			await utils.prerender({
				dest: bucket
			});

			utils.log.minor('Copying assets...');
			utils.copy_static_files(bucket);
			utils.copy_client_files(bucket);
		}
	};

	return adapter;
};

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
