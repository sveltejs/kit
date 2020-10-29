'use strict';

const { writeFileSync, readFileSync, existsSync } = require('fs');
const { resolve, join, relative } = require('path');
const parse = require('@architect/parser');
const child_process = require('child_process');
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
					(page) =>
						`{ pattern: ${page.pattern}, parts: ${JSON.stringify(page.parts)} }`
				)
				.join(',\n\t\t\t')}
		],
		server_routes: [
			${manifest.server_routes
				.map(
					(route) =>
						`{ name: '${route.name}', pattern: ${route.pattern}, file: '${
							route.file
						}', params: ${JSON.stringify(route.params)} }`
				)
				.join(',\n\t\t\t')}
		]
	};`.replace(/^\t/gm, '');
}

function parse_arc(arcPath) {
	if (!existsSync(arcPath)) {
		throw new Error(`No ${arcPath} found. See the documentation.`);
	}

	try {
		const text = readFileSync(arcPath).toString();
		const arc = parse(text);

		return {
			static: arc.static[0][1]
		};
	} catch (e) {
		throw new Error(
			`Error parsing ${arcPath}. Please consult the documentation for correct syntax.`
		);
	}
}

module.exports = async function builder({ dir, manifest, log }) {
	log.minor('Parsing app.arc file');
	const { static: static_mount_point } = parse_arc('app.arc');

	const lambda_directory = resolve(join('src', 'http', 'get-index'));
	const static_directory = resolve(static_mount_point);
	const server_directory = resolve(join('src', 'shared'));

	log.minor('Writing client application...' + static_directory);
	const static_assets = copy(
		'static',
		static_directory
	);
	const client_assets = copy(
		resolve(dir, 'client'),
		join(static_directory, '_app')
	);

	// log.minor('Prerendering static pages...');
	// await prerender({
	//   dir,
	//   out: static_directory,
	//   manifest,
	//   log
	// });

	log.minor('Building lambda...' + lambda_directory);
	copy(resolve(__dirname, 'src'), lambda_directory);
	child_process.execSync('npm install', {
		stdio: [0, 1, 2],
		cwd: lambda_directory
	});

	log.minor('Writing manifest...' + server_directory);
	copy(join(resolve(dir), 'client.json'), join(server_directory, 'client.json'));
	const written_manifest = write_manifest(manifest);
	const htmlPath = resolve('src', 'app.html');
	const appHtml = readFileSync(htmlPath, 'utf-8');
	writeFileSync(join(server_directory, 'manifest.js'), written_manifest);
	writeFileSync(
		join(server_directory, 'template.js'),
		`module.exports = ${JSON.stringify(appHtml)};`
	);
  
  log.minor('Preparing static assets...' + static_directory);
  const relative_static_assets = [
		...static_assets,
		...client_assets
	].map(filename => `/${relative(static_directory, filename)}`);
	const all_static_assets = JSON.stringify(relative_static_assets);
	writeFileSync(
		join(server_directory, 'static_assets.js'),
		`module.exports = ${all_static_assets}`
	);

	log.minor('Writing server application...');
	copy(resolve(dir, 'server'), server_directory);
};
