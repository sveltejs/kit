const fs = require('fs');
const { prerender } = require('@sveltejs/app-utils/renderer');
const { copy } = require('@sveltejs/app-utils/files');

module.exports = async function adapter({
	dir,
	manifest,
	log
}) {
	const out = 'build'; // TODO implement adapter options

	copy(`${dir}/client`, `${out}/assets/_app`, file => file[0] !== '.');
	copy(`${dir}/server`, out);
	copy(`${__dirname}/server.js`, `${out}/index.js`);
	copy(`${dir}/client.json`, `${out}/client.json`);
	copy('src/app.html', `${out}/app.html`);

	log.minor('Prerendering static pages...');

	await prerender({
		dir,
		out: `${out}/prerendered`,
		assets: `${out}/assets`,
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
		endpoints: [
			${manifest.endpoints.map(route => `{ name: '${route.name}', pattern: ${route.pattern}, file: '${route.file}', params: ${JSON.stringify(route.params)} }`).join(',\n\t\t\t')}
		]
	};`.replace(/^\t/gm, '');

	fs.writeFileSync(`${out}/manifest.js`, written_manifest);
};