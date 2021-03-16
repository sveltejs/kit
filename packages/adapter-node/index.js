import { copyFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

/**
 * @param {{
 *   out?: string;
 * }} options
 */
export default function ({ out = 'build' } = {}) {
	/** @type {import('@sveltejs/kit').Adapter} */
	const adapter = {
		async adapt(builder) {
			const dir = dirname(fileURLToPath(import.meta.url));

			builder.log.minor('Copying assets');
			const static_directory = join(out, 'assets');
			builder.copy_client_files(static_directory);
			builder.copy_static_files(static_directory);

			builder.log.minor('Copying server');
			builder.copy_server_files(out);

			copyFileSync(`${dir}/files/server.js`, `${out}/index.js`);

			builder.log.minor('Prerendering static pages');
			await builder.prerender({
				dest: `${out}/prerendered`
			});
		}
	};

	return adapter;
}
