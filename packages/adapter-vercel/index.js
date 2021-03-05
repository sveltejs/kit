import { writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve, join } from 'path';
import { fileURLToPath } from 'url';
import { copy } from '@sveltejs/app-utils/files';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default async function adapter(builder) {
	const vercel_output_directory = resolve('.vercel_build_output');
	const config_directory = join(vercel_output_directory, 'config');
	const static_directory = join(vercel_output_directory, 'static');
	const lambda_directory = join(vercel_output_directory, 'functions', 'node', 'render');
	const server_directory = join(lambda_directory, 'server');

	builder.log.minor('Writing client application...');
	builder.copy_static_files(static_directory);
	builder.copy_client_files(static_directory);

	builder.log.minor('Building lambda...');
	builder.copy_server_files(server_directory);

	copy(join(__dirname, 'files'), lambda_directory);

	builder.log.minor('Prerendering static pages...');
	await builder.prerender({
		dest: static_directory
	});

	builder.log.minor('Writing routes...');
	mkdirSync(config_directory);
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
