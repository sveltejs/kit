import { bold, green } from 'kleur/colors';
import {
	copy_from_template_additions,
	update_package_json_dev_deps,
	upsert_package_json_scripts
} from './utils';

/**
 * @param {string} cwd
 * @param {import('../types').Options} options
 */
export default async function add_eslint(cwd, options) {
	if (!options.eslint) return;

	upsert_package_json_scripts(cwd, {
		lint: 'eslint --ignore-path .gitignore .'
	});

	if (options.typescript) {
		update_package_json_dev_deps(cwd, {
			'@typescript-eslint/eslint-plugin': '^4.19.0',
			'@typescript-eslint/parser': '^4.19.0',
			eslint: '^7.22.0',
			'eslint-plugin-svelte3': '^3.1.0'
		});
		copy_from_template_additions(cwd, { from: ['.eslintrc.ts.cjs'], to: ['.eslintrc.cjs'] });
	} else {
		update_package_json_dev_deps(cwd, {
			eslint: '^7.22.0',
			'eslint-plugin-svelte3': '^3.1.0'
		});
		copy_from_template_additions(cwd, ['.eslintrc.cjs']);
	}

	console.log(
		bold(
			green(
				'✔ Added ESLint.\n' +
					'Readme for ESLint and Svelte: https://github.com/sveltejs/eslint-plugin-svelte3'
			)
		)
	);
}
