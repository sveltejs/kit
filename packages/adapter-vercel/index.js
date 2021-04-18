const { writeFileSync } = require('fs');
const { join } = require('path');
const esbuild = require('esbuild');

module.exports = function () {
	/** @type {import('@sveltejs/kit').Adapter} */
	const adapter = {
		name: '@sveltejs/adapter-vercel',

		async adapt(utils) {
			const dir = '.vercel_build_output';
			utils.rimraf(dir);

			const files = join(__dirname, 'files');

			const dirs = {
				static: join(dir, 'static'),
				lambda: join(dir, 'functions/node/render')
			};

			// TODO ideally we'd have something like utils.tmpdir('vercel')
			// rather than hardcoding '.svelte/vercel/entry.js', and the
			// relative import from that file to output/server/app.js
			// would be controlled. at the moment we're exposing
			// implementation details that could change
			utils.log.minor('Generating serverless function...');
			utils.copy(join(files, 'entry.js'), '.svelte/vercel/entry.js');

			await esbuild.build({
				entryPoints: ['.svelte/vercel/entry.js'],
				outfile: join(dirs.lambda, 'index.js'),
				bundle: true,
				platform: 'node'
			});

			writeFileSync(join(dirs.lambda, 'package.json'), JSON.stringify({ type: 'commonjs' }));

			utils.log.minor('Prerendering static pages...');
			await utils.prerender({
				dest: dirs.static
			});

			utils.log.minor('Copying assets...');
			utils.copy_static_files(dirs.static);
			utils.copy_client_files(dirs.static);

			utils.log.minor('Writing routes...');
			utils.copy(join(files, 'routes.json'), join(dir, 'config/routes.json'));
		}
	};

	return adapter;
};
