import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { mkdirp } from '../../utils/filesystem.js';
import { installPolyfills } from '../../exports/node/polyfills.js';
import { load_config } from '../config/index.js';

const [, , dest, manifest_path, env] = process.argv;

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
await server.init({ env: JSON.parse(env) });

const rendered = await server.respond(new Request(config.prerender.origin + '/[fallback]'), {
	getClientAddress: () => {
		throw new Error('Cannot read clientAddress during prerendering');
	},
	prerendering: {
		fallback: true,
		dependencies: new Map()
	},
	read: (file) => readFileSync(join(config.files.assets, file))
});

mkdirp(dirname(dest));
writeFileSync(dest, await rendered.text());
