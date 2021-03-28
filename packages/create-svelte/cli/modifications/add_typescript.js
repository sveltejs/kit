import fs from 'fs';
import { bold, green } from 'kleur/colors';
import { join } from 'path';
import {
	add_svelte_preprocess_to_config,
	copy_from_template_additions,
	update_component,
	update_package_json_dev_deps
} from './utils';

/**
 * Add TypeScript if user wants it.
 *
 * @param {string} cwd
 * @param {boolean} yes
 */
export default async function add_typescript(cwd, yes) {
	if (yes) {
		update_package_json_dev_deps(cwd, {
			typescript: '^4.0.0',
			tslib: '^2.0.0',
			'svelte-preprocess': '^4.0.0'
		});
		update_component(cwd, 'src/lib/Counter.svelte', [
			['<script>', '<script lang="ts">'],
			['const increment = () => {', 'const increment = (): void => {']
		]);
		update_component(cwd, 'src/routes/index.svelte', [['<script>', '<script lang="ts">']]);
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
	} else {
		console.log("You can add TypeScript support later. We'll let you know soon how to do it.");
	}
}

/**
 * @param {string} cwd
 */
function add_tsconfig(cwd) {
	fs.unlinkSync(join(cwd, 'jsconfig.json'));
	copy_from_template_additions(cwd, ['tsconfig.json']);
}
