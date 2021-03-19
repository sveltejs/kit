import { readFileSync, existsSync } from 'fs';
import { copy } from '@sveltejs/app-utils/files';
import { resolve, join } from 'path';
import parse from '@architect/parser';

/** @param {string} file */
function parse_arc(file) {
	if (!existsSync(file)) {
		throw new Error(`No ${file} found. See the documentation.`);
	}

	try {
		const text = readFileSync(file).toString();
		const arc = parse(text);

		return {
			static: arc.static[0][1]
		};
	} catch (e) {
		throw new Error(`Error parsing ${file}. Please consult the documentation for correct syntax.`);
	}
}

export default function () {
	/** @type {import('@sveltejs/kit').Adapter} */
	const adapter = {
		name: '@sveltejs/adapter-begin',

		async adapt(builder) {
			builder.log.minor('Parsing app.arc file');
			const { static: static_mount_point } = parse_arc('app.arc');

			const lambda_directory = resolve(join('src', 'http', 'get-index'));
			const static_directory = resolve(static_mount_point);
			const server_directory = resolve(join('src', 'shared'));

			builder.log.minor('Writing client application...');
			builder.copy_static_files(static_directory);
			builder.copy_client_files(static_directory);

			builder.log.minor('Building lambda...');
			const local_lambda_dir = join(__dirname, 'files');
			copy(local_lambda_dir, lambda_directory);

			builder.log.minor('Writing server application...');
			builder.copy_server_files(server_directory);

			builder.log.minor('Prerendering static pages...');
			await builder.prerender({
				dest: static_directory
			});
		}
	};

	return adapter;
}
