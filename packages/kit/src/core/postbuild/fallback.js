/** @import { SSRHandler } from '@sveltejs/kit' */
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
 * }} opts
 */
async function generate_fallback({ manifest_path, env, out_dir, origin, assets }) {
	const server_root = join(out_dir, 'output');

	/** @type {import('types').ServerInternalModule} */
	const { set_building } = await import(pathToFileURL(`${server_root}/server/internal.js`).href);

	/** @type {import('types').ServerModule} */
	const { Server } = await import(pathToFileURL(`${server_root}/server/server.js`).href);

	/** @type {import('@sveltejs/kit').SSRManifest} */
	const manifest = (await import(pathToFileURL(manifest_path).href)).manifest;

	set_building();

	const server = new Server(manifest);
	await server.init({
		env,
		read: (file) => {
			throw new Error(`Cannot call \`read\` for ${file} while prerendering a fallback page`);
		}
	});

	/** @type {{ default: SSRHandler }} */
	const { default: init_server } = await import(
		pathToFileURL(`${server_root}/server/handler.js`).href
	);
	const respond = await init_server({
		respond: (request, options) => {
			return server.respond(request, {
				...options,
				getClientAddress: () => {
					throw new Error('Cannot read clientAddress during prerendering');
				},
				prerendering: {
					fallback: true,
					dependencies: new Map(),
					remote_responses: new Map()
				},
				read: (file) => readFileSync(join(assets, file))
			});
		}
	});

	const response = await respond(new Request(origin + '/[fallback]'));

	if (response.ok) {
		return await response.text();
	}

	throw stackless('Could not create a fallback page');
}
