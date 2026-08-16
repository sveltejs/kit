import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import * as devalue from 'devalue';
import { forked } from '../../utils/fork.js';
import { stackless } from '../../utils/error.js';
import { import_peer } from '../../utils/import.js';
import { load_vite_config } from '../config/index.js';
import { get_runtime_base } from '../utils.js';
import { get_runner } from '../../runner.js';

export default forked(import.meta.url, generate_fallback);

/**
 * @param {{
 *   manifest_path: string | null;
 *   env: Record<string, string>
 *   out: string;
 *   origin: string;
 *   assets: string;
 *   vite_config_file: string;
 *   client: string;
 * }} opts
 */
async function generate_fallback({
	manifest_path,
	env,
	out,
	origin,
	assets,
	vite_config_file,
	client
}) {
	const { server, vite_dev_server } = manifest_path
		? await get_ssr_build_server({ manifest_path, out, env })
		: await get_ssr_vite_server({ vite_config_file, env, client });

	try {
		const response = await server.respond(new Request(origin + '/[fallback]'), {
			getClientAddress: () => {
				throw new Error('Cannot read clientAddress during prerendering');
			},
			prerendering: {
				fallback: true,
				dependencies: new Map(),
				remote_responses: new Map(),
				resolved_route_ids: new Set()
			},
			read: (file) => readFileSync(join(assets, file))
		});

		if (response.ok) {
			return await response.text();
		}
	} finally {
		await vite_dev_server?.close();
	}

	throw stackless('Could not create a fallback page');
}

/**
 * @param {object} opts
 * @param {string} opts.manifest_path
 * @param {string} opts.out
 * @param {Record<string, string>} opts.env
 */
async function get_ssr_build_server({ manifest_path, out, env }) {
	/** @type {import('types').SSRManifest} */
	const manifest = (await import(pathToFileURL(manifest_path).href)).manifest;

	/** @type {import('types').ServerInternalModule} */
	const { set_building } = await import(pathToFileURL(`${out}/server/internal.js`).href);

	// configure `import { building } from `$app/env` —
	// essential we do this before analysing the code
	set_building();

	/** @type {import('types').ServerModule} */
	const { Server } = await import(pathToFileURL(`${out}/server/index.js`).href);

	const server = new Server(manifest);
	await server.init({ env });

	return {
		server,
		vite_dev_server: null
	};
}

/**
 * @param {object}opts
 * @param {string} opts.vite_config_file
 * @param {Record<string, string>} opts.env
 * @param {string} opts.client
 */
async function get_ssr_vite_server({ vite_config_file, env, client }) {
	const vite = /** @type {typeof import('vite')} */ (await import_peer('vite', process.cwd()));
	const vite_config = await load_vite_config(vite_config_file, vite, 'serve', {
		logLevel: 'silent',
		server: { hmr: false }
	});

	const vite_dev_server = await vite.createServer(vite_config);
	await vite_dev_server.listen(0);

	try {
		// initialise the server with a request so that the SSR manifest gets built
		if (!vite_dev_server.resolvedUrls?.local[0]) {
			throw new Error('failed to resolve vite dev server url');
		}
		await fetch(new URL('/_app/building', vite_dev_server.resolvedUrls?.local[0]));

		const runtime_base = get_runtime_base(vite_config.root);

		const runner = get_runner(vite, vite_dev_server);
		const env_internal = /** @type {typeof import('../../runtime/app/env/server.js')} */ (
			await runner.import(`${runtime_base}/app/env/server.js`)
		);

		// configure `import { building } from `$app/env` —
		// essential we do this before analysing the code
		env_internal.set_building();

		// `set_env` and `Server` live in modules that import the user's `src/env` config. We import them
		// *after* `set_building()` so that `building`-dependent expressions resolve correctly

		/** @type {import('types').ServerModule} */
		const { Server } = await runner.import(`${runtime_base}/server/index.js`);

		/** @type {{ manifest: import('types').SSRManifest }} */
		// @ts-expect-error we've added `__sveltekit` to the Vite dev server object
		const { manifest } = vite_dev_server.__sveltekit;
		manifest.client = devalue.parse(client);

		const server = new Server(manifest);
		await server.init({ env });

		return {
			server,
			vite_dev_server
		};
	} catch (error) {
		await vite_dev_server.close();
		throw error;
	}
}
