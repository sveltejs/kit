const { writeFileSync, readFileSync } = require('fs');
const { resolve, join } = require('path');
const { prerender } = require('@sveltejs/app-utils/renderer');
const { copy } = require('@sveltejs/app-utils/files');

function write_manifest(manifest) {
	return `module.exports = {
		layout: ${JSON.stringify(manifest.layout)},
		error: ${JSON.stringify(manifest.error)},
		components: ${JSON.stringify(manifest.components)},
		pages: [
			${manifest.pages
				.map(
					page =>
						`{ pattern: ${page.pattern}, parts: ${JSON.stringify(page.parts)} }`
				)
				.join(',\n\t\t\t')}
		],
		endpoints: [
			${manifest.endpoints
				.map(
					route =>
						`{ name: '${route.name}', pattern: ${route.pattern}, file: '${
							route.file
						}', params: ${JSON.stringify(route.params)} }`
				)
				.join(',\n\t\t\t')}
		]
	};`.replace(/^\t/gm, '');
}

module.exports = async function builder({ dir, manifest, log }) {
	const lambda_directory = resolve('api');
	const static_directory = resolve('public');
	const server_directory = resolve(join('api', 'server'));

	log.minor('Writing client application...');
	copy('static', static_directory);
	copy(resolve(dir, 'client'), join(static_directory, '_app'));

	log.minor('Building lambda...');
	copy(resolve(__dirname, 'src'), lambda_directory);
	copy(join(resolve(dir), 'client.json'), join(server_directory, 'client.json'));
	const written_manifest = write_manifest(manifest);
	const htmlPath = resolve('src', 'app.html');
	const appHtml = readFileSync(htmlPath, 'utf-8');
	writeFileSync(join(server_directory, 'manifest.js'), written_manifest);
	writeFileSync(
		join(server_directory, 'template.js'),
		`module.exports = ${JSON.stringify(appHtml)};`
	);

	log.minor('Prerendering static pages...');
	await prerender({
		dir,
		out: static_directory,
		manifest,
		log
	});

	log.minor('Writing server application...');
	copy(resolve(dir, 'server'), server_directory);

	// TODO: Merge this, rather than write it
	log.minor('Rewriting vercel configuration...');
	writeFileSync(
		`vercel.json`,
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
};
