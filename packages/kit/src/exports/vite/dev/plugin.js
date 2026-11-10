/** @import { Plugin, ViteDevServer } from 'vite' */
/** @import { RemoteChunk } from 'types' */
import fs from 'node:fs';
import path from 'node:path';
import { exactRegex, prefixRegex } from '@rolldown/pluginutils';
import { DEV_HOST_ID, DEV_REMOTE_PREFIX, DEV_SERVER_ID } from '../../../constants.js';
import { runtime_directory } from '../../../core/utils.js';
import { posixify } from '../../../utils/os.js';
import { get_dev_origin } from '../utils.js';

const s = JSON.stringify;

/**
 * provides virtual:sveltekit/server and the modules it uses to reach the vite dev server
 * @param {() => string} get_root
 * @param {() => RemoteChunk[]} get_remotes
 * @returns {Plugin}
 */
export function plugin_dev_server(get_root, get_remotes) {
	/** @type {ViteDevServer} */
	let server;

	return {
		name: 'vite-plugin-sveltekit-dev-server',
		apply: 'serve',

		configureServer(dev_server) {
			server = dev_server;
		},

		resolveId: {
			filter: {
				id: [exactRegex(DEV_SERVER_ID), exactRegex(DEV_HOST_ID), prefixRegex(DEV_REMOTE_PREFIX)]
			},
			handler(id) {
				return '\0' + id;
			}
		},

		load: {
			filter: {
				id: [
					exactRegex('\0' + DEV_SERVER_ID),
					exactRegex('\0' + DEV_HOST_ID),
					prefixRegex('\0' + DEV_REMOTE_PREFIX)
				]
			},
			handler(id) {
				id = id.slice(1);

				if (id === DEV_SERVER_ID) {
					return [
						`import { create_dev_server } from ${s(`${runtime_directory}/server/dev_instance.js`)};`,
						`export const server = create_dev_server(${s(this.environment.name)});`
					].join('\n');
				}

				if (id === DEV_HOST_ID) {
					return `export const origin = ${s(get_dev_origin(server))};`;
				}

				const hash = id.slice(DEV_REMOTE_PREFIX.length);
				const remote = get_remotes().find((remote) => remote.hash === hash);

				if (remote) {
					const file = path.resolve(get_root(), remote.file);

					if (fs.existsSync(file)) {
						return `import * as module from ${s(posixify(file))};\nexport default module;`;
					}
				}

				// the server responds with a 404 for unknown remote functions
				return 'export default {};';
			}
		}
	};
}
