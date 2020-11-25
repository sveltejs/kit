import { writeFileSync, readFileSync } from 'fs';
import { resolve, join } from 'path';
import { copy } from '@sveltejs/app-utils/files';
import { prerender, generate_manifest_module } from '@sveltejs/app-utils/renderer';

export async function builder({
	dir,
	manifest,
	log
}) {
	const lambda_directory = resolve('api');
	const static_directory = resolve('public');
	const server_directory = resolve(join('api', 'server'));

	log.info('Writing client application...');
	copy('static', static_directory);
	copy(resolve(dir, 'client'), join(static_directory, '_app'));

	log.info('Building lambda...');
	copy(resolve(__dirname, 'src'), lambda_directory);
	copy(join(resolve(dir), 'client.json'), join(server_directory, 'client.json'));
	const written_manifest = generate_manifest_module(manifest);
	const htmlPath = resolve('src', 'app.html');
	const appHtml = readFileSync(htmlPath, 'utf-8');
	writeFileSync(join(server_directory, 'manifest.js'), written_manifest);
	writeFileSync(
		join(server_directory, 'template.js'),
		`module.exports = ${JSON.stringify(appHtml)};`
	);

	log.info('Prerendering static pages...');
	await prerender({
		force: true,
		dir,
		out: static_directory,
		manifest,
		log
	});

	log.info('Writing server application...');
	copy(resolve(dir, 'server'), server_directory);

	// TODO: Merge this, rather than write it
	log.info('Rewriting vercel configuration...');
	writeFileSync(
		'vercel.json',
		JSON.stringify({
			public: true,
			build: {
				env: {
					NODEJS_AWS_HANDLER_NAME: 'handler'
				}
			},
			rewrites: [
				{
					source: '/(.*)',
					destination: '/api/render/'
				}
			]
		})
	);
}
