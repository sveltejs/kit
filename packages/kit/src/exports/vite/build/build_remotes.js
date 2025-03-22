import fs from 'fs';
import path from 'path';
import { dedent } from '../../../core/sync/utils.js';

/**
 * Adjusts the remote entry points such that that they include the correct action URL if needed
 * @param {import('types').ServerMetadata} metadata
 * @param {import('types').ValidatedConfig} svelte_config
 * @param {string} out
 */
export function build_remotes(metadata, svelte_config, out) {
	for (const [name, exports] of metadata.remotes) {
		const file_path = `${out}/server/remote/${name}.js`;
		const sibling_file_path = file_path + '__internal.js';
		const merged_exports = [...exports.values()].flatMap(names => names);

		fs.copyFileSync(file_path, sibling_file_path);
		fs.writeFileSync(
			file_path,
			create_public_remote_file(merged_exports, `./${path.basename(sibling_file_path)}`, name, svelte_config),
			'utf-8'
		);
	}
}

/**
 * @param {string[]} exports
 * @param {string} id
 * @param {string} hash
 * @param {import('types').ValidatedConfig} svelte_config
 */
export function create_public_remote_file(exports, id, hash, svelte_config) {
	return dedent`
    import { ${exports.join(', ')} } from '${id}';
    let $$_exports = {${exports.join(',')}};
    for (const key in $$_exports) {
        const fn = $$_exports[key];
        if (fn.__type === 'formAction') {
            fn._set_action('${svelte_config.kit.paths.base}/${svelte_config.kit.appDir}/remote/${hash}/' + key);
        }
    }
    export { ${exports.join(', ')} };
`;
}
