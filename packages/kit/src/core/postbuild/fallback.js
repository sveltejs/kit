import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { installPolyfills } from '../../exports/node/polyfills.js';
import { load_config } from '../config/index.js';
import { forked } from '../../utils/fork.js';

export default forked(import.meta.url, generate_fallback);

/**
 * @param {{
 *   manifest_path: string;
 *   env: Record<string, string>
 * }} opts
 */
async function generate_fallback({ manifest_path, env }) {
	/** @type {import('types').ValidatedKitConfig} */
	const config = (await load_config()).kit;

	installPolyfills();

	const server_root = join(config.outDir, 'output');

	/** @type {import('types').ServerInternalModule} */
	const { set_building } = await import(pathToFileURL(`${server_root}/server/internal.js`).href);

	/** @type {import('types').ServerModule} */
	const { Server } = await import(pathToFileURL(`${server_root}/server/index.js`).href);

	/** @type {import('types').SSRManifest} */
	const manifest = (await import(pathToFileURL(manifest_path).href)).manifest;

	set_building(true);

	const server = new Server(manifest);
	await server.init({ env });

	const usual_browser_headers = {
		'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
		'accept-encoding': 'gzip, deflate, br',
		'user-agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36'
		//other VERY VERY COMMON stuff
	};

	const response = await server.respond(new Request(config.prerender.origin + '/[fallback]', {headers: usual_browser_headers}), {
		getClientAddress: () => {
			throw new Error('Cannot read clientAddress during prerendering');
		},
		prerendering: {
			fallback: true,
			dependencies: new Map()
		},
		read: (file) => readFileSync(join(config.files.assets, file))
	});

	if (response.ok) {
		return await response.text();
	}

	throw new Error(`Could not create a fallback page — failed with status ${response.status}`);
}
