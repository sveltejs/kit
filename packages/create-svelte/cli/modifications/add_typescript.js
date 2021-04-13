import fs from 'fs';
import { bold, green } from 'kleur/colors';
import { join } from 'path';
import {
	add_svelte_preprocess_to_config,
	copy_from_template_additions,
	update_package_json_dev_deps
} from './utils';

/**
 * @param {string} cwd
 * @param {import('../types').Options} options
 */
export default async function add_typescript(cwd, options) {
	if (!options.typescript) return;

	update_package_json_dev_deps(cwd, {
		typescript: '^4.0.0',
		tslib: '^2.0.0',
		'svelte-preprocess': '^4.0.0'
	});
	add_svelte_preprocess_to_config(cwd);
	add_tsconfig(cwd);

	console.log(
		bold(
			green(
				'✔ Added TypeScript support. ' +
					'To use it inside Svelte components, add lang="ts" to the attributes of a script tag.'
			)
		)
	);
}

/** @param {string} cwd */
function add_tsconfig(cwd) {
	fs.unlinkSync(join(cwd, 'jsconfig.json'));
	copy_from_template_additions(cwd, ['tsconfig.json']);
}
