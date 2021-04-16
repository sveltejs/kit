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

		async adapt(utils) {
			utils.log.minor('Copying assets');
			const static_directory = join(out, 'assets');
			utils.copy_client_files(static_directory);
			utils.copy_static_files(static_directory);

			utils.log.minor('Copying server');
			utils.copy_server_files(out);

			copyFileSync(`${__dirname}/files/server.js`, `${out}/index.js`);

			utils.log.minor('Prerendering static pages');
			await utils.prerender({
				dest: `${out}/prerendered`
			});
		}
	};

	return adapter;
};
