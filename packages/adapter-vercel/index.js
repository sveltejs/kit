const { writeFileSync, mkdirSync, renameSync } = require('fs');
const { resolve, join } = require('path');

module.exports = function () {
	/** @type {import('@sveltejs/kit').Adapter} */
	const adapter = {
		name: '@sveltejs/adapter-vercel',

		async adapt(utils) {
			const vercel_output_directory = resolve('.vercel_build_output');
			const config_directory = join(vercel_output_directory, 'config');
			const static_directory = join(vercel_output_directory, 'static');
			const lambda_directory = join(vercel_output_directory, 'functions', 'node', 'render');
			const server_directory = join(lambda_directory, 'server');

			utils.log.minor('Writing client application...');
			utils.copy_static_files(static_directory);
			utils.copy_client_files(static_directory);

			utils.log.minor('Building lambda...');
			utils.copy_server_files(server_directory);
			renameSync(join(server_directory, 'app.js'), join(server_directory, 'app.mjs'));

			utils.copy(join(__dirname, 'files'), lambda_directory);

			utils.log.minor('Prerendering static pages...');
			await utils.prerender({
				dest: static_directory
			});

			utils.log.minor('Writing routes...');
			try {
				mkdirSync(config_directory);
			} catch {
				// directory already exists
			}
			writeFileSync(
				join(config_directory, 'routes.json'),
				JSON.stringify([
					{
						handle: 'filesystem'
					},
					{
						src: '/.*',
						dest: '.vercel/functions/render'
					}
				])
			);
		}
	};

	return adapter;
};
