'use strict';

const {
	copyFileSync,
	writeFileSync,
	readFileSync,
	existsSync
} = require('fs');
const { resolve, join, dirname, relative } = require('path');
const glob = require('tiny-glob/sync');
const parse = require('@architect/parser');
const child_process = require('child_process');
const { prerender } = require('@sveltejs/app-utils/renderer');
const { mkdirp } = require('@sveltejs/app-utils/files');

const copy_contents = (
	source_directory,
	base_destination_directory,
	relativeTo = '.'
) => {
	let assets = [];
	glob('**/*', { cwd: source_directory, filesOnly: true }).forEach((file) => {
		if (file[0] == '.') {
			return;
		}
		copy_single(source_directory, base_destination_directory, file);
		assets.push(
			`/${relative(relativeTo, join(base_destination_directory, file))}`
		);
	});
	return assets;
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
	const static_assets = copy_contents(
		'static',
		static_directory,
		static_directory
	);
	const client_assets = copy_contents(
		resolve(dir, 'client'),
		join(static_directory, '_app'),
		static_directory
	);

	// log.minor('Prerendering static pages...');
	// await prerender({
	//   dir,
	//   out: static_directory,
	//   manifest,
	//   log
	// });

	log.minor('Building lambda...' + lambda_directory);
	copy_contents(resolve(__dirname, 'src'), lambda_directory);
	child_process.execSync('npm install', {
		stdio: [0, 1, 2],
		cwd: lambda_directory
	});

	log.minor('Writing manifest...' + server_directory);
	copy_single(resolve(dir), server_directory, 'client.json');
	const written_manifest = write_manifest(manifest);
	const htmlPath = resolve('src', 'app.html');
	const appHtml = readFileSync(htmlPath, 'utf-8');
	writeFileSync(join(server_directory, 'manifest.js'), written_manifest);
	writeFileSync(
		join(server_directory, 'template.js'),
		`module.exports = ${JSON.stringify(appHtml)};`
	);
	const all_static_assets = JSON.stringify([
		...static_assets,
		...client_assets
	]);
	writeFileSync(
		join(server_directory, 'static_assets.js'),
		`module.exports = ${all_static_assets}`
	);

	log.minor('Writing server application...');
	copy_contents(resolve(dir, 'server'), server_directory);
};
