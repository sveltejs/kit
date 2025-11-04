/** @import { RemoteInfo } from 'types' */

/** @type {RemoteInfo['type'][]} */
const types = ['command', 'form', 'prerender', 'query', 'query_batch'];

/**
 * @param {Record<string, any>} module
 * @param {string} file
 * @param {string} hash
 */
export function init_remote_functions(module, file, hash) {
	if (module.default) {
		throw new Error(
			`Cannot export \`default\` from a remote module (${file}) — please use named exports instead`
		);
	}

	for (const [name, fn] of Object.entries(module)) {
		if (!types.includes(fn?.__?.type)) {
			throw new Error(
				`\`${name}\` exported from ${file} is invalid — all exports from this file must be remote functions`
			);
		}

		fn.__.id = create_remote_id(hash, name);
		fn.__.name = name;
	}
}

export const REMOTE_CACHE_PREFIX = '@sveltejs/kit/remote';
export const REMOTE_CACHE_DELIMITER = '::::';

/**
 * @param {string} id
 * @param {string} payload
 */
export function create_remote_cache_key(id, payload) {
	return `${REMOTE_CACHE_PREFIX}${REMOTE_CACHE_DELIMITER}${id}${REMOTE_CACHE_DELIMITER}${payload ?? ''}`;
}

/**
 * @param {(string | undefined)[]} identifiers
 */
export function create_remote_id(...identifiers) {
	return identifiers.filter((id) => id !== undefined).join(REMOTE_CACHE_DELIMITER);
}
