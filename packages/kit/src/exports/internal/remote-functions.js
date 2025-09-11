/**
 * @param {Record<string, any>} module
 * @param {string} file
 */
export function validate_remote_functions(module, file) {
	if (module.default) {
		throw new Error(
			`Cannot export \`default\` from a remote module (${file}) — please use named exports instead`
		);
	}

	for (const name in module) {
		const type = /** @type {import('types').RemoteInfo['type']} */ (module[name]?.__?.type);

		if (
			type !== 'form' &&
			type !== 'command' &&
			type !== 'query' &&
			type !== 'query_batch' &&
			type !== 'prerender'
		) {
			throw new Error(
				`\`${name}\` exported from ${file} is invalid — all exports from this file must be remote functions`
			);
		}
	}
}
