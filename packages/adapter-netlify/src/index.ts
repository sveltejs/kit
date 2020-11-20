import fs from 'fs';
import path from 'path';
import toml from 'toml';
import glob from 'tiny-glob/sync';
import { RouteManifest } from '@sveltejs/app-utils';
import { mkdirp } from '@sveltejs/app-utils/files';
import { prerender, generate_manifest_module } from '@sveltejs/app-utils/renderer';
import { Logger } from '@sveltejs/app-utils/renderer/prerender';

module.exports = async function builder({
	dir,
	manifest,
	log
}: {
	dir: string,
	manifest: RouteManifest,
	log: Logger
}) {
	let netlify_config;

	if (fs.existsSync('netlify.toml')) {
		try {
			netlify_config = toml.parse(fs.readFileSync('netlify.toml', 'utf-8'));
		} catch (err) {
			err.message = `Error parsing netlify.toml: ${err.message}`;
			throw err;
		}
	} else {
		throw new Error('Missing a netlify.toml file. Consult https://github.com/sveltejs/kit/tree/master/packages/adapter-netlify#configuration');
	}

	if (!netlify_config.build || !netlify_config.build.publish || !netlify_config.build.functions) {
		throw new Error('You must specify build.publish and build.functions in netlify.toml. Consult https://github.com/sveltejs/adapter-netlify#configuration');
	}

	const publish = path.resolve(netlify_config.build.publish);
	const functions = path.resolve(netlify_config.build.functions);

	mkdirp(`${publish}/_app`);
	mkdirp(`${functions}/render`);

	// copy everything in `static`
	glob('**/*', { cwd: 'static', filesOnly: true }).forEach(file => {
		mkdirp(path.dirname(`${publish}/${file}`));
		fs.copyFileSync(`static/${file}`, `${publish}/${file}`);
	});

	// copy client code
	const client_code = path.resolve(dir, 'client');
	glob('**/*', { cwd: client_code, filesOnly: true }).forEach(file => {
		if (file[0] !== '.') {
			mkdirp(path.dirname(`${publish}/_app/${file}`));
			fs.copyFileSync(`${client_code}/${file}`, `${publish}/_app/${file}`);
		}
	});

	// prerender
	log.info('Prerendering static pages...');
	await prerender({
		force: true,
		dir,
		out: publish,
		manifest,
		log
	});

	// copy server code
	const server_code = path.resolve(dir, 'server');
	glob('**/*', { cwd: server_code, filesOnly: true }).forEach(file => {
		if (file[0] !== '.') {
			mkdirp(path.dirname(`${functions}/render/${file}`));
			fs.copyFileSync(`${server_code}/${file}`, `${functions}/render/${file}`);
		}
	});

	// copy the renderer
	fs.copyFileSync(path.resolve(__dirname, 'render.js'), `${functions}/render/index.js`);

  // write manifest
	fs.writeFileSync(`${functions}/render/manifest.js`, generate_manifest_module(manifest));

	// copy client manifest
	fs.copyFileSync(`${dir}/client.json`, `${functions}/render/client.json`);

	// copy template
	fs.writeFileSync(`${functions}/render/template.js`, `module.exports = ${JSON.stringify(fs.readFileSync('src/app.html', 'utf-8'))};`);

	// create _redirects
	fs.writeFileSync(`${publish}/_redirects`, '/* /.netlify/functions/render 200');
};
