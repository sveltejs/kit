const { renameSync } = require('fs');
const { resolve, join } = require('path');

module.exports = function () {
	/** @type {import('@sveltejs/kit').Adapter} */
	const adapter = {
		name: '@sveltejs/adapter-lambda-edge',

		async adapt(utils) {
			const lambda_output_directory = resolve('.lambda_edge_build');
			const static_directory = join(lambda_output_directory, 'static');
			const lambda_directory = join(lambda_output_directory, 'function');
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
		}
	};

	return adapter;
};
