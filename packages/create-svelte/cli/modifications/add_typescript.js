import fs from 'fs';
import { bold, green } from 'kleur/colors';
import { join } from 'path';
import { add_svelte_preprocess_to_config, update_component, update_package_json } from './utils';

export default async function add_typescript(cwd, yes) {
	if (yes) {
		update_package_json(cwd, {
			typescript: '^4.0.0',
			tslib: '^2.0.0',
			'svelte-preprocess': '^4.0.0'
		});
		update_component(cwd, 'src/components/Counter.svelte', [
			['<script>', '<script lang="ts">'],
			['let count = 0', 'let count: number = 0']
		]);
		update_component(cwd, 'src/routes/index.svelte', [['<script>', '<script lang="ts">']]);
		add_svelte_preprocess_to_config(cwd);
		add_tsconfig(cwd);
		add_d_ts_file(cwd);

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

function add_tsconfig(cwd) {
	fs.unlinkSync(join(cwd, 'jsconfig.json'));
	copy_from_ts_template(cwd, 'tsconfig.json');
}

function add_d_ts_file(cwd) {
	copy_from_ts_template(cwd, 'src', 'globals.d.ts');
}

function copy_from_ts_template(cwd, ...path) {
	fs.copyFileSync(join(__dirname, 'ts-template', ...path), join(cwd, ...path));
}
