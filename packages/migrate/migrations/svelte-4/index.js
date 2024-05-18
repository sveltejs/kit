import colors from 'kleur';
import fs from 'node:fs';
import prompts from 'prompts';
import glob from 'tiny-glob/sync.js';
import { bail, check_git, update_js_file, update_svelte_file } from '../../utils.js';
import { transform_code, transform_svelte_code, update_pkg_json } from './migrate.js';

export async function migrate() {
	if (!fs.existsSync('package.json')) {
		bail('Please re-run this script in a directory with a package.json');
	}

	console.log(
		colors
			.bold()
			.yellow(
				'\nThis will update files in the current directory\n' +
					"If you're inside a monorepo, don't run this in the root directory, rather run it in all projects independently.\n"
			)
	);

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

	const folders = await prompts({
		type: 'multiselect',
		name: 'value',
		message: 'Which folders should be migrated?',
		choices: fs
			.readdirSync('.')
			.filter(
				(dir) => fs.statSync(dir).isDirectory() && dir !== 'node_modules' && !dir.startsWith('.')
			)
			.map((dir) => ({ title: dir, value: dir, selected: true }))
	});

	if (!folders.value?.length) {
		process.exit(1);
	}

	const migrate_transition = await prompts({
		type: 'confirm',
		name: 'value',
		message:
			'Add the `|global` modifier to currently global transitions for backwards compatibility? More info at https://svelte.dev/docs/v4-migration-guide#transitions-are-local-by-default',
		initial: true
	});

	update_pkg_json();

	// const { default: config } = fs.existsSync('svelte.config.js')
	// 	? await import(pathToFileURL(path.resolve('svelte.config.js')).href)
	// 	: { default: {} };

	/** @type {string[]} */
	const svelte_extensions = /* config.extensions ?? - disabled because it would break .svx */ [
		'.svelte'
	];
	const extensions = [...svelte_extensions, '.ts', '.js'];
	// For some reason {folders.value.join(',')} as part of the glob doesn't work and returns less files
	const files = folders.value.flatMap(
		/** @param {string} folder */ (folder) =>
			glob(`${folder}/**`, { filesOnly: true, dot: true })
				.map((file) => file.replace(/\\/g, '/'))
				.filter((file) => !file.includes('/node_modules/'))
	);

	for (const file of files) {
		if (extensions.some((ext) => file.endsWith(ext))) {
			if (svelte_extensions.some((ext) => file.endsWith(ext))) {
				update_svelte_file(file, transform_code, (code) =>
					transform_svelte_code(code, migrate_transition.value)
				);
			} else {
				update_js_file(file, transform_code);
			}
		}
	}

	console.log(colors.bold().green('✔ Your project has been migrated'));

	console.log('\nRecommended next steps:\n');

	const cyan = colors.bold().cyan;

	const tasks = [
		use_git && cyan('git commit -m "migration to Svelte 4"'),
		'Review the migration guide at https://svelte.dev/docs/v4-migration-guide',
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
