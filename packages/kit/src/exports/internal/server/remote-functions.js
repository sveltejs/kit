/** @import { RemoteInternals } from 'types' */
import * as e from '../../../messages/server-errors.js';
import { DEV } from 'esm-env';

/** @type {RemoteInternals['type'][]} */
const types = ['command', 'form', 'prerender', 'query', 'query_batch', 'query_live'];

/**
 * @param {Record<string, any>} module
 * @param {string} file
 * @param {string} hash
 * @param {{ file: string}=} dev_decoration
 */
export function init_remote_functions(module, file, hash, dev_decoration) {
	if (module.default) {
		e.remote_module_default_export({ file });
	}

	for (const [name, fn] of Object.entries(module)) {
		if (!types.includes(fn?.__?.type)) {
			e.remote_module_invalid_export({ name, file });
		}

		fn.__.id = `${hash}/${name}`;
		fn.__.name = name;
		if (DEV && dev_decoration) {
			fn.__.dev_loc = {
				...dev_decoration,
				...fn.__.dev_loc
			};
		}
	}
}
