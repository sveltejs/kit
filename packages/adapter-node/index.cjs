const { copyFileSync } = require('fs');
const { join } = require('path');

/**
 * @param {{
 *   out?: string;
 * }} options
 */
module.exports = function ({ out = 'build' } = {}) {
	/** @type {import('@sveltejs/kit').Adapter} */
	const adapter = {
		name: '@sveltejs/adapter-node',

		async adapt(builder) {
			builder.log.minor('Copying assets');
			const static_directory = join(out, 'assets');
			builder.copy_client_files(static_directory);
			builder.copy_static_files(static_directory);

			builder.log.minor('Copying server');
			builder.copy_server_files(out);

			copyFileSync(`${__dirname}/files/server.js`, `${out}/index.js`);

			builder.log.minor('Prerendering static pages');
			await builder.prerender({
				dest: `${out}/prerendered`
			});
		}
	};

	return adapter;
};
