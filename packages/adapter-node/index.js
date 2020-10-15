const fs = require('fs');
const { copy, prerender } = require('@sveltejs/app-utils');

module.exports = async function adapter({
	input,
	output,
	manifest,
	log
}) {
	copy(`${input}/client`, `${output}/assets/_app`, file => file[0] !== '.');
	copy(`${input}/server`, output);
	copy(`${__dirname}/server.js`, `${output}/index.js`);
	copy(`${input}/client.json`, `${output}/client.json`);
	copy('src/app.html', `${output}/app.html`);

	await prerender({
		input,
		output: `${output}/assets`,
		manifest,
		log
	});

	// generate manifest
	const written_manifest = `module.exports = {
		layout: ${JSON.stringify(manifest.layout)},
		error: ${JSON.stringify(manifest.error)},
		components: ${JSON.stringify(manifest.components)},
		pages: [
			${manifest.pages.map(page => `{ pattern: ${page.pattern}, parts: ${JSON.stringify(page.parts)} }`).join(',\n\t\t\t')}
		],
		server_routes: [
			${manifest.server_routes.map(route => `{ name: '${route.name}', pattern: ${route.pattern}, file: '${route.file}', params: ${JSON.stringify(route.params)} }`).join(',\n\t\t\t')}
		]
	};`.replace(/^\t/gm, '');

	fs.writeFileSync(`${output}/manifest.js`, written_manifest);
};