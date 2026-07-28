/** @import { InternalServer } from 'types' */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { forked } from '../../utils/fork.js';
import { stackless } from '../../utils/error.js';

export default forked(import.meta.url, generate_fallback);

/**
 * @param {{
 *   manifest_path: string;
 *   env: Record<string, string>
 *   out_dir: string;
 *   origin: string;
 *   assets: string;
 *   customHandler: string | undefined;
 * }} opts
 */
async function generate_fallback({ manifest_path, env, out_dir, origin, assets, customHandler }) {
	const server_root = join(out_dir, 'output');

	/** @type {import('types').ServerInternalModule} */
	const { set_building } = await import(pathToFileURL(`${server_root}/server/internal.js`).href);

	/** @type {import('types').ServerModule} */
	const { Server } = await import(pathToFileURL(`${server_root}/server/server.js`).href);

	/** @type {import('@sveltejs/kit').SSRManifest} */
	const manifest = (await import(pathToFileURL(manifest_path).href)).manifest;

	set_building();

	const server = new Server(manifest);
	await server.init({ env });

	const original_respond = server.respond.bind(server);

	/** @type {import('@sveltejs/kit').Server['respond'] | undefined} */
	let custom_respond;

	if (customHandler) {
		/** @type {{ default: import('@sveltejs/kit').SSRHandler }} */
		const { default: init_server } = await import(
			pathToFileURL(`${server_root}/server/index.js`).href
		);
		/** @type {InternalServer['respond']} */
		custom_respond = await init_server(server, env);
	}

	server.respond = (request, options) => {
		return original_respond(request, {
			...options,
			prerendering: {
				fallback: true,
				dependencies: new Map(),
				remote_responses: new Map()
			},
			read: (file) => readFileSync(join(assets, file))
		});
	};

	const response = await /** @type {import('@sveltejs/kit').Server['respond']} */ (
		custom_respond ?? server.respond
	)(new Request(origin + '/[fallback]'), {
		getClientAddress: () => {
			throw new Error('Cannot read clientAddress during prerendering');
		}
	});

	if (response.ok) {
		return await response.text();
	}

	throw stackless('Could not create a fallback page');
}
