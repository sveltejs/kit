import colors from 'kleur';
import fs from 'node:fs';
import prompts from 'prompts';
import glob from 'tiny-glob/sync.js';
import { remove_self_closing_tags } from './migrate.js';
// import { update_js_file, update_svelte_file } from '../../utils.js';
// import { transform_code, transform_svelte_code } from './migrate.js';

export async function migrate() {
	console.log(
		colors.bold().yellow('\nThis will update .svelte files inside the current directory\n')
	);

	const response = await prompts({
		type: 'confirm',
		name: 'value',
		message: 'Continue?',
		initial: false
	});

	if (!response.value) {
		process.exit(1);
	}

	const files = glob(`**/*.svelte`)
		.map((file) => file.replace(/\\/g, '/'))
		.filter((file) => !file.includes('/node_modules/'));

	for (const file of files) {
		// replace all occurrences of e.g. `<div />` with `<div></div>`, preserving attributes etc
		const code = remove_self_closing_tags(fs.readFileSync(file, 'utf-8'));
		fs.writeFileSync(file, code);
	}

	console.log(colors.bold().green('✔ Your project has been updated'));
}
