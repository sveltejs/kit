const { writeFileSync } = require('fs');
const { resolve, join } = require('path');

module.exports = function () {
	/** @type {import('@sveltejs/kit').Adapter} */
	const adapter = {
		name: '@sveltejs/adapter-vercel',

		async adapt(utils) {
			const vercel_output_directory = resolve('.vercel_build_output');
			utils.rimraf(vercel_output_directory);

			const config_directory = join(vercel_output_directory, 'config');
			const static_directory = join(vercel_output_directory, 'static');
			const lambda_directory = join(vercel_output_directory, 'functions', 'node', 'render');

			utils.copy(join(__dirname, 'src/entry.js'), '.svelte/vercel/entry.js');

			const esbuild = (await import('esbuild')).default;

			await esbuild.build({
				entryPoints: ['.svelte/vercel/entry.js'],
				outfile: join(lambda_directory, 'index.js'),
				bundle: true,
				platform: 'node'
			});

			writeFileSync(join(lambda_directory, 'package.json'), JSON.stringify({ type: 'commonjs' }));

			utils.log.minor('Writing client application...');
			utils.copy_static_files(static_directory);
			utils.copy_client_files(static_directory);

			utils.log.minor('Prerendering static pages...');
			await utils.prerender({
				dest: static_directory
			});

			utils.log.minor('Writing routes...');
			utils.mkdirp(config_directory);
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
