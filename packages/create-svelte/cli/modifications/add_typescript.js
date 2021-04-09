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
 * Get the file modifications required in order to add support to TypeScript
 *
 * @param {string} template
 */
const get_ts_modifications_by_template = (template) => {
	if (!template) return [];

	const modifications = {
		common: [
			{
				file: 'src/routes/index.svelte',
				changes: [['<script>', '<script lang="ts">']]
			},
			{
				file: 'src/routes/$layout.svelte',
				changes: [['<script>', '<script lang="ts">']]
			}
		],
		skeleton: [],
		default: [
			{
				file: 'src/lib/Counter.svelte',
				changes: [
					['<script>', '<script lang="ts">'],
					[
						'let action = { operation: undefined };',
						"let action: { operation?: 'ADD' | 'REMOVE' } = { operation: undefined };"
					],
					[
						'const counterTransition = (_, { duration }) => {',
						'const counterTransition = (_, { duration }: { duration: number}) => {'
					]
				]
			},
			{
				file: 'src/lib/DarkModeToggle.svelte',
				changes: [['<script>', '<script lang="ts">']]
			},
			{
				file: 'src/lib/HeaderNavigation.svelte',
				changes: [['<script>', '<script lang="ts">']]
			}
		]
	};

	return [
		...modifications.common,
		...(template === 'default' ? modifications.default : modifications.skeleton)
	];
};

/**
 * Add TypeScript if user wants it.
 *
 * @param {string} cwd
 * @param {boolean} yes
 */
export default async function add_typescript(cwd, yes, project_template) {
	if (yes) {
		update_package_json_dev_deps(cwd, {
			typescript: '^4.0.0',
			tslib: '^2.0.0',
			'svelte-preprocess': '^4.0.0'
		});

		const modification_list = get_ts_modifications_by_template(project_template);
		modification_list.forEach((modification) => {
			update_component(cwd, modification.file, modification.changes);
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
