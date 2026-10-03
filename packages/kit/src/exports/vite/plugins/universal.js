/** @import { Plugin } from 'vite' */
import path from 'node:path';
import MagicString from 'magic-string';
import { dedent } from '../../../core/sync/utils.js';
import { runtime_directory } from '../../../core/utils.js';
import { hash } from '../../../utils/hash.js';
import { s } from '../../../utils/misc.js';
import { posixify } from '../../../utils/os.js';

const extensions = /\.(?:[cm]?[jt]sx?|svelte)$/;

/**
 * Assigns stable ids to universal functions (`query`, `command` and `form` from `$app/universal`).
 *
 * Universal functions run on both the server and the client. In order to reuse the results of
 * queries that were computed during SSR when hydrating, and to find forms that are submitted
 * without JavaScript, both sides need to agree on an id. We derive it from the module's path
 * relative to the project root and the export name, the same way as for remote functions.
 *
 * @param {() => { root: string }} get_config
 * @returns {Plugin}
 */
export function plugin_universal(get_config) {
	/** @type {string} */
	let root;

	return {
		name: 'vite-plugin-sveltekit-universal',

		// run after other plugins (e.g. TypeScript and Svelte compilation) so that we're dealing with JavaScript
		enforce: 'post',

		configResolved() {
			({ root } = get_config());
		},

		applyToEnvironment(environment) {
			return environment.name !== 'serviceWorker';
		},

		transform: {
			filter: {
				code: '$app/universal'
			},
			handler(code, id) {
				if (id.includes('?') || id.startsWith('\0')) return;
				if (!extensions.test(id)) return;
				if (posixify(id).startsWith(posixify(runtime_directory))) return;

				// rough check that this module actually imports `$app/universal`
				if (!/from\s*['"]\$app\/universal['"]/.test(code)) return;

				const file = posixify(path.relative(root, id));
				const universal_hash = hash(file);

				const ms = new MagicString(code);

				// Extra newlines to prevent syntax errors around missing semicolons or comments.
				// We import the module itself to iterate over its exports — at this point (the end
				// of the module) all of them are initialized. Reading a binding re-exported from a
				// module in a cycle that hasn't been evaluated yet can throw, hence the try/catch
				ms.append(
					'\n\n' +
						dedent`
							import * as $$_universal_self_$$ from ${s('./' + path.basename(id))};

							for (const name of Object.keys($$_universal_self_$$)) {
								try {
									const __ = $$_universal_self_$$[name]?.__universal;
									if (__ && !__.id) {
										__.id = ${s(universal_hash)} + '/' + name;
										__.name = name;
									}
								} catch {}
							}
						`
				);

				return {
					code: ms.toString(),
					map: ms.generateMap({ hires: 'boundary' })
				};
			}
		}
	};
}
