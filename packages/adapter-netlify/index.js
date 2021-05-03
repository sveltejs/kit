import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import esbuild from 'esbuild';
import toml from 'toml';

export default function () {
	/** @type {import('@sveltejs/kit').Adapter} */
	const adapter = {
		name: '@sveltejs/adapter-netlify',

		async adapt(utils) {
			const { publish, functions } = validate_config().build;

			utils.rimraf(publish);
			utils.rimraf(functions);

			const files = join(__dirname, 'files');

			utils.log.minor('Generating serverless function...');
			utils.copy(join(files, 'entry.js'), '.svelte/netlify/entry.js');

			await esbuild.build({
				entryPoints: ['.svelte/netlify/entry.js'],
				outfile: join(functions, 'render/index.js'),
				bundle: true,
				platform: 'node'
			});

			writeFileSync(join(functions, 'package.json'), JSON.stringify({ type: 'commonjs' }));

			utils.log.info('Prerendering static pages...');
			await utils.prerender({
				dest: publish
			});

			utils.log.minor('Copying assets...');
			utils.copy_static_files(publish);
			utils.copy_client_files(publish);

			utils.log.minor('Writing redirects...');
			utils.copy(`${files}/_redirects`, `${publish}/_redirects`);
		}
	};

	return adapter;
}

function validate_config() {
	if (existsSync('netlify.toml')) {
		let netlify_config;

		try {
			netlify_config = toml.parse(readFileSync('netlify.toml', 'utf-8'));
		} catch (err) {
			err.message = `Error parsing netlify.toml: ${err.message}`;
			throw err;
		}

		if (!netlify_config.build || !netlify_config.build.publish || !netlify_config.build.functions) {
			throw new Error(
				'You must specify build.publish and build.functions in netlify.toml. Consult https://github.com/sveltejs/kit/tree/master/packages/adapter-netlify#configuration'
			);
		}

		return netlify_config;
	}

	// TODO offer to create one?
	throw new Error(
		'Missing a netlify.toml file. Consult https://github.com/sveltejs/kit/tree/master/packages/adapter-netlify#configuration'
	);
}
