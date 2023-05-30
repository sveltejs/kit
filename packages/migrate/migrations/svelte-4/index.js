import colors from 'kleur';
import fs from 'node:fs';
import prompts from 'prompts';
import glob from 'tiny-glob/sync.js';
import { bail, check_git } from '../../utils.js';
import { update_js_file, update_svelte_file } from './migrate.js';

export async function migrate() {
	if (!fs.existsSync('package.json')) {
		bail('Please re-run this script in a directory with a package.json');
	}

	console.log(colors.bold().yellow('\nThis will update files in the current directory\n'));

	const use_git = check_git();

	const response = await prompts({
		type: 'confirm',
		name: 'value',
		message: 'Continue?',
		initial: false
	});

	if (!response.value) {
		process.exit(1);
	}

	// const { default: config } = fs.existsSync('svelte.config.js')
	// 	? await import(pathToFileURL(path.resolve('svelte.config.js')).href)
	// 	: { default: {} };

	/** @type {string[]} */
	const svelte_extensions = /* config.extensions ?? - disabled because it would break .svx */ ['.svelte'];
	const extensions = [...svelte_extensions, '.ts', '.js'];
	// TODO read tsconfig/jsconfig if available? src/** will be good for 99% of cases
	const files = glob('src/**', { filesOnly: true, dot: true }).map((file) =>
		file.replace(/\\/g, '/')
	);

	for (const file of files) {
		if (extensions.some((ext) => file.endsWith(ext))) {
			if (svelte_extensions.some((ext) => file.endsWith(ext))) {
				update_svelte_file(file);
			} else {
				update_js_file(file);
			}
		}
	}

	console.log(colors.bold().green('✔ Your project has been migrated'));

	console.log('\nRecommended next steps:\n');

	const cyan = colors.bold().cyan;

	const tasks = [
		use_git && cyan('git commit -m "migration to Svelte 4"'),
		'Review the migration guide at TODO',
		'Read the updated docs at https://svelte.dev/docs'
	].filter(Boolean);

	tasks.forEach((task, i) => {
		console.log(`  ${i + 1}: ${task}`);
	});

	console.log('');

	if (use_git) {
		console.log(`Run ${cyan('git diff')} to review changes.\n`);
	}
}
