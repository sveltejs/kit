import fs from 'fs';
import { bold, green } from 'kleur/colors';
import { join } from 'path';
import {
	copy_from_template_additions,
	update_package_json_dev_deps,
	upsert_package_json_scripts
} from './utils';

/**
 * Add TypeScript if user wants it.
 *
 * @param {string} cwd
 * @param {boolean} yes
 * @param {boolean} usesEslint
 */
export default async function add_prettier(cwd, yes, usesEslint) {
	if (!yes) {
		return;
	}

	update_package_json_dev_deps(cwd, {
		prettier: '~2.2.1',
		'prettier-plugin-svelte': '^2.2.0'
	});
	copy_from_template_additions(cwd, ['.prettierrc']);
	copy_from_template_additions(cwd, ['.prettierignore']);

	if (usesEslint) {
		update_package_json_dev_deps(cwd, {
			'eslint-config-prettier': '^8.1.0'
		});
		add_prettier_to_eslint_extends(cwd);
		upsert_package_json_scripts(cwd, {
			lint: 'prettier --check . && eslint .',
			format: 'prettier --write .'
		});
	} else {
		upsert_package_json_scripts(cwd, {
			lint: 'prettier --check .',
			format: 'prettier --write .'
		});
	}

	console.log(
		bold(
			green(
				'✔ Added Prettier.\n' +
					'General formatting options: https://prettier.io/docs/en/options.html\n' +
					'Svelte-specific formatting options: https://github.com/sveltejs/prettier-plugin-svelte#options'
			)
		)
	);
}

/**
 * @param {string} cwd
 */
function add_prettier_to_eslint_extends(cwd) {
	const file = join(cwd, '.eslintrc.cjs');
	let code = fs.readFileSync(file, 'utf-8');

	const insertIdx = code.indexOf(']', code.indexOf('extends: ['));
	code = code.substring(0, insertIdx) + ", 'prettier'" + code.substring(insertIdx);

	fs.writeFileSync(file, code, 'utf-8');
}
