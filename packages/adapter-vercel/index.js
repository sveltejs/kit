const { copyFileSync, mkdirSync, writeFileSync, readFileSync } = require('fs');
const { resolve, join, dirname } = require('path');
const glob = require('tiny-glob/sync');
const { prerender, mkdirp } = require('@sveltejs/app-utils');

const copy_contents = (source_directory, base_destination_directory) => {
	glob('**/*', { cwd: source_directory, filesOnly: true }).forEach(file => {
		if (file[0] == '.') {
			return;
		}
		copy_single(source_directory, base_destination_directory, file);
	});
};

const copy_single = (source_directory, base_destination_directory, file) => {
	const destination_file = join(base_destination_directory, file);
	const destination_directory = dirname(destination_file);
	mkdirp(destination_directory);

	copyFileSync(join(source_directory, file), destination_file);
};

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
		server_routes: [
			${manifest.server_routes
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
	copy_contents('static', static_directory);
	copy_contents(resolve(dir, 'client'), join(static_directory, '_app'));

	log.minor('Building lambda...');
	copy_single(resolve(__dirname, 'src'), lambda_directory, 'render.js');
	copy_single(resolve(dir), server_directory, 'client.json');
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
	copy_contents(resolve(dir, 'server'), server_directory);

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
