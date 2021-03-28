'use strict';

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const toml = require('toml');

module.exports = function () {
	/** @type {import('@sveltejs/kit').Adapter} */
	const adapter = {
		name: '@sveltejs/adapter-cloudflare-workers',
		async adapt(builder) {
			let wrangler_config;

			if (fs.existsSync('wrangler.toml')) {
				try {
					wrangler_config = toml.parse(fs.readFileSync('wrangler.toml', 'utf-8'));
				} catch (err) {
					err.message = `Error parsing wrangler.toml: ${err.message}`;
					throw err;
				}
			} else {
				// TODO offer to create one?
				throw new Error(
					'Missing a wrangler.toml file. Consult https://developers.cloudflare.com/workers/platform/sites/configuration on how to setup your site'
				);
			}

			if (!wrangler_config.site || !wrangler_config.site.bucket) {
				throw new Error(
					'You must specify site.bucket in wrangler.toml. Consult https://developers.cloudflare.com/workers/platform/sites/configuration'
				);
			}

			const bucket = path.resolve(wrangler_config.site.bucket);
			const entrypoint = path.resolve(wrangler_config.site['entry-point'] ?? 'workers-site');

			builder.copy_static_files(bucket);
			builder.copy_client_files(bucket);
			builder.copy_server_files(entrypoint);

			// copy the renderer
			builder.copy(path.resolve(__dirname, 'files/render.js'), `${entrypoint}/index.js`);
			builder.copy(path.resolve(__dirname, 'files/_package.json'), `${entrypoint}/package.json`);

			builder.log.info('Prerendering static pages...');
			await builder.prerender({
				dest: bucket
			});

			builder.log.info('Installing Worker Dependencies...');
			exec(
				'npm install',
				{
					cwd: entrypoint
				},
				(error, stdout, stderr) => {
					builder.log.info(stderr);
					if (error) {
						builder.log.error(error);
					}
				}
			);
		}
	};

	return adapter;
};
