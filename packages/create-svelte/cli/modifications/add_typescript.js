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
 * @param {boolean} is_skeleton_template
 */
export default async function add_typescript(cwd, yes, is_skeleton_template) {
	if (yes) {
		update_package_json_dev_deps(cwd, {
			typescript: '^4.0.0',
			tslib: '^2.0.0',
			'svelte-preprocess': '^4.0.0'
		});

        update_component(cwd, 'src/routes/index.svelte', [['<script>', '<script lang="ts">']]);
        update_component(cwd, 'src/routes/$layout.svelte', [['<script>', '<script lang="ts">']]);

        if (!is_skeleton_template) {
            update_component(cwd, 'src/lib/DarkModeToggle.svelte', [['<script>', '<script lang="ts">']]);
            update_component(cwd, 'src/lib/HeaderNavigation.svelte', [['<script>', '<script lang="ts">']]);
            update_component(cwd, 'src/lib/Counter.svelte', [
                ['<script>', '<script lang="ts">'],
                [
                    'let action = { operation: undefined };',
                    "let action: { operation?: 'ADD' | 'REMOVE' } = { operation: undefined };"
                ],
                [
                    'const counterTransition = (_, { duration }) => {',
                    'const counterTransition = (_, { duration }: { duration: number}) => {'
                ]
            ]);
        }

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
